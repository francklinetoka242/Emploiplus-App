import { createClient } from '@supabase/supabase-js';
import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const smtpHost = process.env.SMTP_HOST!;
const smtpPort = parseInt(process.env.SMTP_PORT!);
const smtpUser = process.env.SMTP_USER!;
const smtpPass = process.env.SMTP_PASS!;
const jwtSecret = process.env.EMAIL_SIGNING_SECRET!;
const deepLinkUrl = process.env.DEEP_LINK_URL || 'emploiplus://verify';

const supabase = createClient(supabaseUrl, supabaseKey);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

// ================== HELPERS ==================

function createHMACToken(email: string, userId: string, secret: string): string {
  const payload = JSON.stringify({ email, userId, iat: Date.now() });
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

function verifyHMACToken(token: string, secret: string): { email: string; userId: string } | null {
  try {
    const [payload, signature] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    if (hmac === signature) {
      return decoded;
    }
  } catch (e) {
    console.error('Token verification error:', e);
  }
  return null;
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ================== HANDLERS ==================

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Failed to create user' });
    }

    const userId = authData.user.id;

    const { error: candidateInsertError } = await supabase.from('candidates').insert({
      user_id: userId,
      first_name: firstName?.trim() || 'Candidat',
      last_name: lastName?.trim() || 'Mobile',
      email: email.trim(),
      status: 'active',
    });

    if (candidateInsertError) {
      console.error('Candidate insert error:', candidateInsertError);
      return res.status(400).json({
        error: candidateInsertError.message || 'Failed to create candidate profile',
      });
    }

    const code = generateVerificationCode();
    const token = createHMACToken(email, userId, jwtSecret);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const { error: codeError } = await supabase
      .from('email_verification_codes')
      .insert([
        {
          email,
          code,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          attempts: 0,
          max_attempts: 5,
        },
      ]);

    if (codeError) {
      return res.status(500).json({ error: 'Failed to store verification code' });
    }

    const deepLink = `${deepLinkUrl}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;
    const mailContent = `
      <h2>Bienvenue sur Emploiplus!</h2>
      <p>Votre code de vérification : <strong>${code}</strong></p>
      <p>Ou cliquez ici pour confirmer : <a href="${deepLink}">Confirmer automatiquement</a></p>
      <p>Ce code expire dans 20 minutes.</p>
    `;

    await transporter.sendMail({
      from: `${process.env.FROM_NAME || 'Emploiplus'} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Code de vérification Emploiplus',
      html: mailContent,
    });

    res.status(200).json({
      success: true,
      userId,
      email,
      message: 'User registered. Check your email for verification code.',
    });
  } catch (error: any) {
    console.error('Mobile register error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleConfirm(req: VercelRequest, res: VercelResponse) {
  try {
    const { token, code, email, userId } = req.body;

    if (!email || !userId || (!token && !code)) {
      return res.status(400).json({
        error: 'Email, userId and either code or token are required',
      });
    }

    // Deep link token flow
    if (token) {
      const decoded = verifyHMACToken(token, jwtSecret);
      if (!decoded || decoded.email !== email || decoded.userId !== userId) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });

      if (updateError) {
        return res.status(500).json({ error: 'Failed to confirm email' });
      }

      await supabase
        .from('email_verification_codes')
        .update({ verified_at: new Date().toISOString() })
        .eq('email', email)
        .eq('user_id', userId);

      return res.status(200).json({
        success: true,
        message: 'Email confirmed successfully',
      });
    }

    // Manual 6-digit code flow
    const { data: verificationRow, error: verificationError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verificationError || !verificationRow) {
      return res.status(400).json({ error: 'Verification record not found' });
    }

    if (verificationRow.verified_at) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const expiresAt = new Date(verificationRow.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    const attemptsUsed = Number(verificationRow.attempts ?? 0);
    const maxAttempts = Number(verificationRow.max_attempts ?? 5);

    if (attemptsUsed >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts',
        attemptsRemaining: 0,
      });
    }

    if (String(verificationRow.code) !== String(code).trim()) {
      const nextAttempts = attemptsUsed + 1;

      await supabase
        .from('email_verification_codes')
        .update({ attempts: nextAttempts })
        .eq('id', verificationRow.id);

      return res.status(400).json({
        error: 'Invalid verification code',
        attemptsRemaining: Math.max(maxAttempts - nextAttempts, 0),
      });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      return res.status(500).json({ error: 'Failed to confirm email' });
    }

    await supabase
      .from('email_verification_codes')
      .update({
        verified_at: new Date().toISOString(),
        attempts: attemptsUsed + 1,
      })
      .eq('id', verificationRow.id);

    return res.status(200).json({
      success: true,
      message: 'Email confirmed successfully',
    });
  } catch (error: any) {
    console.error('Mobile confirm error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleResend(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ error: 'Email and userId required' });
    }

    const code = generateVerificationCode();
    const token = createHMACToken(email, userId, jwtSecret);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const { error: upsertError } = await supabase
      .from('email_verification_codes')
      .upsert([
        {
          email,
          user_id: userId,
          code,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          attempts: 0,
          max_attempts: 5,
        },
      ], { onConflict: 'email' });

    if (upsertError) {
      return res.status(500).json({ error: 'Failed to resend code' });
    }

    const deepLink = `${deepLinkUrl}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;
    const mailContent = `
      <h2>Nouveau code de vérification</h2>
      <p>Votre code : <strong>${code}</strong></p>
      <p>Ou <a href="${deepLink}">cliquez ici</a> pour confirmer automatiquement.</p>
      <p>Valide 20 minutes.</p>
    `;

    await transporter.sendMail({
      from: `${process.env.FROM_NAME || 'Emploiplus'} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Nouveau code Emploiplus',
      html: mailContent,
    });

    res.status(200).json({ success: true, message: 'Code resent' });
  } catch (error: any) {
    console.error('Mobile resend error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleForgot(req: VercelRequest, res: VercelResponse) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users.find((u: any) => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const code = generateVerificationCode();
    const token = createHMACToken(email, user.id, jwtSecret);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    await supabase
      .from('email_verification_codes')
      .upsert([
        {
          email,
          user_id: user.id,
          code,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          attempts: 0,
          max_attempts: 5,
        },
      ], { onConflict: 'email' });

    const deepLink = `${deepLinkUrl}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&userId=${encodeURIComponent(user.id)}`;
    const mailContent = `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Code : <strong>${code}</strong></p>
      <p>Ou <a href="${deepLink}">cliquez ici</a> pour réinitialiser directement.</p>
      <p>Valide 20 minutes.</p>
    `;

    await transporter.sendMail({
      from: `${process.env.FROM_NAME || 'Emploiplus'} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Réinitialisation mot de passe',
      html: mailContent,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
      userId: user.id,
    });
  } catch (error: any) {
    console.error('Mobile forgot error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleReset(req: VercelRequest, res: VercelResponse) {
  try {
    const { token, email, userId, newPassword } = req.body;

    if (!token || !email || !userId || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const decoded = verifyHMACToken(token, jwtSecret);
    if (!decoded || decoded.email !== email || decoded.userId !== userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    await supabase
      .from('email_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('email', email)
      .eq('user_id', userId);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('Mobile reset error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// ================== ROUTER ==================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Route basée sur le query parameter ou le path
  const action = req.query.action || 'register';

  switch (action) {
    case 'register':
      return handleRegister(req, res);
    case 'confirm':
      return handleConfirm(req, res);
    case 'resend':
      return handleResend(req, res);
    case 'forgot':
      return handleForgot(req, res);
    case 'reset':
      return handleReset(req, res);
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}