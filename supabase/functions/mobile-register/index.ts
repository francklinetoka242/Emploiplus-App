import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
};

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function createToken(email: string, userId: string, secret: string) {
  const payload = JSON.stringify({
    email,
    userId,
    exp: Date.now() + 20 * 60 * 1000,
  });

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const encodedPayload = encodeBase64Url(encoder.encode(payload));
  const encodedSignature = encodeBase64Url(new Uint8Array(signature));

  return `${encodedPayload}.${encodedSignature}`;
}

async function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, password, firstName, lastName, confirmationRedirect } = body ?? {};

    if (!email || !password || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: 'Email, password, firstName and lastName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mobileSecret = Deno.env.get('MOBILE_VERIFICATION_SECRET') || 'emploiplus-mobile-dev-secret';

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const adminResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        },
      }),
    });

    const adminPayload = await adminResponse.json().catch(() => ({}));

    if (!adminResponse.ok) {
      const message = adminPayload?.message || adminPayload?.error || 'Unable to create user';
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = adminPayload.user;
    if (!user?.id) {
      throw new Error('User creation succeeded but no user id was returned');
    }

    const { error: candidateError } = await supabase.from('candidates').insert({
      user_id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      status: 'active',
    });

    if (candidateError) {
      console.error('Candidate insert error:', candidateError);
      return new Response(
        JSON.stringify({ error: candidateError.message || 'Failed to create candidate profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = await generateVerificationCode();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const token = await createToken(email, user.id, mobileSecret);

    const { error: codeInsertError } = await supabase.from('email_verification_codes').insert({
      email: email.trim(),
      code,
      user_id: user.id,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: 5,
    });

    if (codeInsertError) {
      console.error('Code insert error:', codeInsertError);
      return new Response(
        JSON.stringify({ error: codeInsertError.message || 'Failed to create verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deepLinkUrl = confirmationRedirect || `emploiplus://confirm?token=${token}`;
    const sendEmailResponse = await fetch('https://www.emploiplus-group.com/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: email,
        subject: 'Vérification de votre compte EmploiPlus',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />
              <style>
                body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; }
                .container { max-width: 640px; margin: 28px auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e5e7eb; }
                .header { background: linear-gradient(135deg, #00009e 0%, #0f172a 100%); padding: 28px 24px 18px; text-align: center; }
                .logo { width: 180px; height: auto; display: block; margin: 0 auto 12px; filter: brightness(0) invert(1); }
                .eyebrow { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #f2c94c; font-weight: 700; }
                .content { padding: 28px 32px 18px; }
                .title { margin: 0 0 12px; font-size: 28px; color: #111827; text-align: center; }
                .text { margin: 0 0 18px; font-size: 16px; line-height: 1.7; color: #374151; text-align: center; }
                .code-box { max-width: 420px; margin: 20px auto 18px; background: linear-gradient(180deg, #fff8e8 0%, #ffffff 100%); border: 2px solid #e8a900; border-radius: 14px; padding: 22px 12px; text-align: center; }
                .code-label { font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #7c5800; font-weight: 700; margin-bottom: 10px; }
                .code { font-size: 42px; letter-spacing: 8px; font-weight: 800; color: #00009e; font-family: Arial, sans-serif; }
                .button-wrap { text-align: center; margin: 18px 0 20px; }
                .button { display: inline-block; background: #e8a900; color: #111827; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; }
                .muted { font-size: 14px; color: #6b7280; line-height: 1.7; text-align: center; }
                .footer { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 20px 32px 30px; text-align: center; }
                .footer a { color: #00009e; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="https://www.emploiplus-group.com/assets/images/Logo.png" alt="EmploiPlus" class="logo" />
                  <div class="eyebrow">Vérification de compte</div>
                </div>

                <div class="content">
                  <h2 class="title">Bonjour,</h2>
                  <p class="text">Pour finaliser votre inscription, veuillez utiliser le code ci-dessous pour vérifier votre adresse email.</p>

                  <div class="code-box">
                    <div class="code-label">Code de vérification</div>
                    <div class="code">${code}</div>
                  </div>

                  <p class="text">Vous pouvez aussi confirmer automatiquement en cliquant sur le bouton ci-dessous.</p>

                  <div class="button-wrap">
                    <a class="button" href="${deepLinkUrl}">Confirmer mon compte</a>
                  </div>

                  <p class="muted">Ce code expire dans 20 minutes.</p>
                  <p class="muted">Si vous n'avez pas initié cette action, veuillez ignorer ce mail.</p>
                </div>

                <div class="footer">
                  <div style="font-size:13px; line-height:1.8; color:#475569;">
                    <strong>Contact :</strong><br />
                    <a href="https://whatsapp.com/channel/0029Vb5pc270VycKAb1tc631">WhatsApp</a>
                    &nbsp;|&nbsp;
                    <a href="mailto:contact@emploiplus-group.com">contact@emploiplus-group.com</a>
                    &nbsp;|&nbsp;
                    <a href="tel:+242067311033">+242 0673 11033</a><br />
                    <a href="https://www.emploiplus-group.com/">www.emploiplus-group.com</a>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Votre code de vérification EmploiPlus est: ${code}\n\nCliquez ici pour ouvrir l’application: ${deepLinkUrl}\n\nCe code expire dans 20 minutes.`,
        template: 'mobile-verification',
      }),
    });

    if (!sendEmailResponse.ok) {
      const emailErrorText = await sendEmailResponse.text();
      console.error('Email send failed:', emailErrorText);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User created, but email delivery failed',
          user: { id: user.id },
          token,
          code,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created and verification email sent',
        user: { id: user.id },
        token,
        code,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('mobile-register error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
