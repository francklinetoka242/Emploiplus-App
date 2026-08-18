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
    const { email, userId } = body ?? {};

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
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
    const now = new Date().toISOString();

    const { data: existingCode } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .is('verified_at', null)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCode) {
      const createdAt = new Date(existingCode.created_at);
      const elapsed = (Date.now() - createdAt.getTime()) / 1000;
      if (elapsed < 60) {
        return new Response(
          JSON.stringify({
            error: 'Please wait before requesting a new code',
            retryAfter: Math.ceil(60 - elapsed),
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const code = await generateVerificationCode();
    const token = await createToken(email, userId || existingCode?.user_id || '', mobileSecret);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('email', email)
      .is('verified_at', null);

    const { error: insertError } = await supabase.from('email_verification_codes').insert({
      email,
      code,
      user_id: userId || existingCode?.user_id || null,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: 5,
    });

    if (insertError) {
      throw insertError;
    }

    const deepLinkUrl = `emploiplus://confirm?token=${token}`;
    const emailResponse = await fetch('https://www.emploiplus-group.com/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: email,
        subject: 'Nouveau code de vérification EmploiPlus',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />
              <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 620px; margin: 24px auto; background: #fff; border-radius: 12px; padding: 32px; }
                .brand { color: #00009e; font-size: 28px; font-weight: 700; margin-bottom: 20px; }
                .code-box { background: #f3f4ff; border: 2px solid #00009e; border-radius: 10px; padding: 24px; margin: 24px 0; text-align: center; }
                .code { font-size: 32px; letter-spacing: 4px; font-weight: 700; color: #00009e; }
                .button { display: inline-block; padding: 12px 20px; background: #00009e; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="brand">EmploiPlus</div>
                <h2>Votre nouveau code</h2>
                <p>Voici votre nouveau code de vérification pour l’application mobile.</p>
                <div class="code-box">
                  <div class="code">${code}</div>
                </div>
                <p><a class="button" href="${deepLinkUrl}">Ouvrir l’application</a></p>
                <p>Ce code expire dans 20 minutes.</p>
              </div>
            </body>
          </html>
        `,
        text: `Votre nouveau code de vérification EmploiPlus est: ${code}\n\nOuvrez l’application: ${deepLinkUrl}\n\nCe code expire dans 20 minutes.`,
        template: 'mobile-verification',
      }),
    });

    if (!emailResponse.ok) {
      const emailErrorText = await emailResponse.text();
      console.error('Resend email failed:', emailErrorText);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code resent successfully',
        token,
        code,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('mobile-resend error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
