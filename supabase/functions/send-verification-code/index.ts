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
    console.log('=== SEND VERIFICATION CODE START ===');
    console.log('Request method:', req.method);
    
    let body;
    try {
      body = await req.json();
      console.log('Parsed body:', body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, userId } = body;
    console.log('Extracted email:', email, 'userId:', userId);

    if (!email) {
      console.error('Email is missing');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key available:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated code:', code);

    // Calculate expiration time (20 minutes from now)
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    console.log('Expiration time:', expiresAt);

    // Insert code into database
    console.log('Inserting code into database...');
    const { error: insertError } = await supabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        user_id: userId || null,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }
    
    console.log('Code inserted successfully');

    // Send email with code via Node.js endpoint
    console.log('Sending email to:', email);
    
    // Build the email payload in the exact format expected by /api/send-email
    const emailPayload = {
      recipient: email,  // REQUIRED: use 'recipient' not 'to'
      subject: 'Code de vérification EmploiPlus',  // REQUIRED
      html: `<!DOCTYPE html>
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
      
      <h2>Bienvenue sur EmploiPlus!</h2>
      
      <p>Pour confirmer votre adresse email et créer votre compte, veuillez utiliser ce code:</p>
      
      <div class="code-box">
        <div class="code">${code}</div>
        <div class="expiration">Ce code expire dans 20 minutes</div>
      </div>
      
      <p>Entrez ce code dans l'application pour terminer votre inscription.</p>
      
      <p>Si vous n'avez pas demandé ce code, veuillez ignorer ce message.</p>
      
      <div class="footer">
        <p>&copy; 2026 EmploiPlus Group. Tous droits réservés.</p>
      </div>
    </div>
  </body>
</html>`,
      text: `Votre code de vérification EmploiPlus est: ${code}\n\nCe code expire dans 20 minutes.\n\nSi vous n'avez pas demandé ce code, veuillez ignorer ce message.`,
      template: 'verification-code',
    };
    
    console.log('Email payload:', JSON.stringify(emailPayload, null, 2));
    
    const emailResponse = await fetch('https://www.emploiplus-group.com/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('Email response status:', emailResponse.status);
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email send error response:', errorText);
      throw new Error(`Email API returned ${emailResponse.status}: ${errorText}`);
    }
    
    const emailResult = await emailResponse.json();
    console.log('Email send success:', emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent successfully',
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
