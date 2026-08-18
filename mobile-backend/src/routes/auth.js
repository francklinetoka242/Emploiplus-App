import express from 'express';
import config from '../config.js';
import { createHmacToken, generateCode, verifyHmacToken } from '../lib/crypto.js';
import { sendEmail } from '../lib/mailer.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.post('/mobile-register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body || {};

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'Email, password, firstName and lastName are required' });
    }

    const normalizedEmail = String(email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const { data: existingUser, error: existingUserError } = await supabase.auth.admin.getUserByEmail(normalizedEmail);
    if (!existingUserError && existingUser?.user) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createUserError || !createdUser?.user) {
      return res.status(400).json({ success: false, message: createUserError?.message || 'Unable to create user' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const token = createHmacToken({ email: normalizedEmail, userId: createdUser.user.id, exp: Date.now() + 20 * 60 * 1000 }, config.auth.hmacSecret);

    const { error: codeInsertError } = await supabase.from('email_verification_codes').insert({
      email: normalizedEmail,
      code,
      user_id: createdUser.user.id,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: 5,
    });

    if (codeInsertError) {
      throw codeInsertError;
    }

    const deepLink = `${config.app.deepLinkScheme}confirm?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: 'Confirmation de votre compte EmploiPlus',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:24px;">
            <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:10px; padding:24px;">
              <h2 style="color:#00009e;">EmploiPlus</h2>
              <p>Bonjour,</p>
              <p>Pour confirmer votre compte, utilisez le code suivant ou ouvrez l’application avec le lien ci-dessous.</p>
              <div style="padding:20px; margin:20px 0; background:#f3f4ff; border:2px solid #00009e; border-radius:10px; text-align:center;">
                <div style="font-size:32px; letter-spacing:4px; font-weight:700; color:#00009e;">${code}</div>
              </div>
              <p><a href="${deepLink}" style="display:inline-block; background:#00009e; color:#fff; padding:12px 18px; text-decoration:none; border-radius:8px;">Ouvrir l’application</a></p>
              <p>Ce code expire dans 20 minutes.</p>
            </div>
          </body>
        </html>
      `,
      text: `Votre code de confirmation EmploiPlus est : ${code}\n\nOuvrez l’application : ${deepLink}\n\nCe code expire dans 20 minutes.`,
    });

    return res.status(200).json({
      success: true,
      message: 'Registration successful. Verification email sent.',
      userId: createdUser.user.id,
      token,
      code,
    });
  } catch (error) {
    console.error('mobile-register error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.post('/mobile-confirm', async (req, res) => {
  try {
    const { email, code, token, userId } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    if (!code && !token) {
      return res.status(400).json({ success: false, message: 'Code or token is required' });
    }

    let paymentRecord = null;

    if (token) {
      const payload = verifyHmacToken(token, config.auth.hmacSecret);
      if (payload.email !== email) {
        return res.status(400).json({ success: false, message: 'Token email does not match' });
      }

      const { data, error } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      paymentRecord = data;
      if (!paymentRecord) {
        return res.status(400).json({ success: false, message: 'No verification record found' });
      }
    } else {
      const { data, error } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      paymentRecord = data;
      if (!paymentRecord) {
        return res.status(400).json({ success: false, message: 'Invalid verification code' });
      }

      if (paymentRecord.attempts >= paymentRecord.max_attempts) {
        return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new code.' });
      }

      if (paymentRecord.code !== code) {
        await supabase
          .from('email_verification_codes')
          .update({ attempts: paymentRecord.attempts + 1 })
          .eq('id', paymentRecord.id);

        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
          attemptsRemaining: paymentRecord.max_attempts - paymentRecord.attempts - 1,
        });
      }
    }

    if (new Date(paymentRecord.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired' });
    }

    const targetUserId = userId || paymentRecord.user_id;
    if (targetUserId) {
      const { error: authError } = await supabase.auth.admin.updateUserById(targetUserId, {
        email_confirm: true,
      });

      if (authError) {
        console.warn('Auth update warning:', authError.message);
      }
    }

    await supabase
      .from('email_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', paymentRecord.id);

    return res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('mobile-confirm error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.post('/mobile-resend', async (req, res) => {
  try {
    const { email, userId } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const { data: existingRecord } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRecord) {
      const elapsedSeconds = (Date.now() - new Date(existingRecord.created_at).getTime()) / 1000;
      if (elapsedSeconds < 60) {
        return res.status(429).json({ success: false, message: 'Please wait before requesting a new code', retryAfter: Math.ceil(60 - elapsedSeconds) });
      }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const token = createHmacToken({ email, userId: userId || existingRecord?.user_id, exp: Date.now() + 20 * 60 * 1000 }, config.auth.hmacSecret);

    await supabase.from('email_verification_codes').delete().eq('email', email).is('verified_at', null);

    const { error: insertError } = await supabase.from('email_verification_codes').insert({
      email,
      code,
      user_id: userId || existingRecord?.user_id || null,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: 5,
    });

    if (insertError) {
      throw insertError;
    }

    const deepLink = `${config.app.deepLinkScheme}confirm?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: email,
      subject: 'Nouveau code de vérification EmploiPlus',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:24px;">
            <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:10px; padding:24px;">
              <h2 style="color:#00009e;">EmploiPlus</h2>
              <p>Voici votre nouveau code de vérification.</p>
              <div style="padding:20px; margin:20px 0; background:#f3f4ff; border:2px solid #00009e; border-radius:10px; text-align:center;">
                <div style="font-size:32px; letter-spacing:4px; font-weight:700; color:#00009e;">${code}</div>
              </div>
              <p><a href="${deepLink}" style="display:inline-block; background:#00009e; color:#fff; padding:12px 18px; text-decoration:none; border-radius:8px;">Ouvrir l’application</a></p>
              <p>Ce code expire dans 20 minutes.</p>
            </div>
          </body>
        </html>
      `,
      text: `Votre nouveau code de vérification EmploiPlus est : ${code}\n\nOuvrez l’application : ${deepLink}\n\nCe code expire dans 20 minutes.`,
    });

    return res.status(200).json({ success: true, message: 'Verification code resent successfully', token, code });
  } catch (error) {
    console.error('mobile-resend error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

export default router;
