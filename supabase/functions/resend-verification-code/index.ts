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
    const { email, userId } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if there's already a valid code
    const now = new Date().toISOString();
    const { data: existingCode } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .is('verified_at', null)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If there's a valid code less than 1 minute old, don't create new one
    if (existingCode) {
      const createdAt = new Date(existingCode.created_at);
      const timeSinceCreation = (Date.now() - createdAt.getTime()) / 1000;
      if (timeSinceCreation < 60) {
        return new Response(
          JSON.stringify({
            error: 'Please wait before requesting a new code',
            retryAfter: Math.ceil(60 - timeSinceCreation),
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate new 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiration time (20 minutes from now)
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Delete old unverified codes for this email
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('email', email)
      .is('verified_at', null);

    // Insert new code
    const { error: insertError } = await supabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        user_id: userId || null,
        expires_at: expiresAt,
      });

    if (insertError) {
      throw insertError;
    }

    // Send email with code via Node.js endpoint
    const emailResponse = await fetch('https://www.emploiplus-group.com/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Nouveau code de vérification EmploiPlus',
        template: 'verification-code',
        data: {
          code,
          expiresInMinutes: 20,
        },
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 5px; }
                .header { text-align: center; margin-bottom: 30px; }
                .code-box { 
                  background-color: #f0f0f0; 
                  border: 2px solid #00009e; 
                  padding: 20px; 
                  text-align: center; 
                  margin: 20px 0;
                  border-radius: 5px;
                }
                .code { 
                  font-size: 32px; 
                  font-weight: bold; 
                  letter-spacing: 2px; 
                  color: #00009e;
                  font-family: monospace;
                }
                .expiration { 
                  font-size: 12px; 
                  color: #666; 
                  margin-top: 10px;
                }
                .footer { 
                  text-align: center; 
                  margin-top: 30px; 
                  font-size: 12px; 
                  color: #999;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="color: #00009e;">EmploiPlus</h1>
                </div>
                
                <h2>Nouveau code de vérification</h2>
                
                <p>Voici votre nouveau code de vérification:</p>
                
                <div class="code-box">
                  <div class="code">${code}</div>
                  <div class="expiration">Ce code expire dans 20 minutes</div>
                </div>
                
                <p>Entrez ce code dans l'application pour confirmer votre adresse email.</p>
                
                <p>Si vous n'avez pas demandé ce code, veuillez ignorer ce message.</p>
                
                <div class="footer">
                  <p>&copy; 2026 EmploiPlus Group. Tous droits réservés.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Votre nouveau code de vérification EmploiPlus est: ${code}\n\nCe code expire dans 20 minutes.`,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email send error:', errorText);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code resent successfully',
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
