import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code, userId } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the verification code record
    const { data: codeRecord, error: fetchError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !codeRecord) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(codeRecord.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Verification code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if max attempts exceeded
    if (codeRecord.attempts >= codeRecord.max_attempts) {
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new code' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code matches
    if (codeRecord.code !== code) {
      // Increment attempts
      await supabase
        .from('email_verification_codes')
        .update({ attempts: codeRecord.attempts + 1 })
        .eq('id', codeRecord.id);

      return new Response(
        JSON.stringify({
          error: 'Invalid verification code',
          attemptsRemaining: codeRecord.max_attempts - codeRecord.attempts - 1,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Code is valid - mark as verified
    const { error: updateError } = await supabase
      .from('email_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', codeRecord.id);

    if (updateError) {
      throw updateError;
    }

    // If userId is provided, confirm email in Supabase Auth
    if (userId) {
      try {
        const adminResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/email_confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
        });

        if (!adminResponse.ok) {
          const errorText = await adminResponse.text();
          console.error('Error confirming email in Auth:', errorText);
          // Continue anyway - code verification succeeded
        }
      } catch (authError) {
        console.error('Error calling auth endpoint:', authError);
        // Continue anyway - code verification succeeded
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email verified successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
