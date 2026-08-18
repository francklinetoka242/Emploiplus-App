import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
};

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyToken(token: string, secret: string) {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid token format');
  }

  const [encodedPayload, encodedSignature] = parts;
  const payloadBytes = decodeBase64Url(encodedPayload);
  const payload = new TextDecoder().decode(payloadBytes);
  const payloadData = JSON.parse(payload);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const expectedSignature = decodeBase64Url(encodedSignature);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    expectedSignature,
    encoder.encode(payload)
  );

  if (!valid) {
    throw new Error('Token signature invalid');
  }

  if (Date.now() > payloadData.exp) {
    throw new Error('Token expired');
  }

  return payloadData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, code, token, userId } = body ?? {};

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!code && !token) {
      return new Response(
        JSON.stringify({ error: 'Code or token is required' }),
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
    let validRecord: any = null;

    if (token) {
      const payload = await verifyToken(token, mobileSecret);
      if (payload.email !== email) {
        return new Response(
          JSON.stringify({ error: 'Token email does not match' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', email)
        .or(`user_id.eq.${payload.userId},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      validRecord = data;
      if (!validRecord) {
        return new Response(
          JSON.stringify({ error: 'No pending verification record found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      const { data, error } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .is('verified_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      validRecord = data;
      if (!validRecord) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (validRecord.attempts >= validRecord.max_attempts) {
        return new Response(
          JSON.stringify({ error: 'Too many failed attempts. Please request a new code' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (validRecord.code !== code) {
        await supabase
          .from('email_verification_codes')
          .update({ attempts: validRecord.attempts + 1 })
          .eq('id', validRecord.id);

        return new Response(
          JSON.stringify({
            error: 'Invalid verification code',
            attemptsRemaining: validRecord.max_attempts - validRecord.attempts - 1,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const expiresAt = new Date(validRecord.expires_at);
    if (new Date() > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Verification code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = userId || validRecord.user_id;
    if (targetUserId) {
      const confirmResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}/email_confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });

      if (!confirmResponse.ok) {
        const confirmText = await confirmResponse.text();
        console.error('Supabase email confirm failed:', confirmText);
      }
    }

    const { error: verifyUpdateError } = await supabase
      .from('email_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', validRecord.id);

    if (verifyUpdateError) {
      throw verifyUpdateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email verified successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('mobile-confirm error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
