
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Non autorizzato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Starting data export for user:', user.id);

    // Create a data export request record
    const { error: requestError } = await supabase
      .from('data_requests')
      .insert({
        user_id: user.id,
        request_type: 'export',
        status: 'processing',
        requested_at: new Date().toISOString(),
      });

    if (requestError) {
      console.error('Error creating data request:', requestError);
    }

    // Collect all user data
    const userData: any = {
      user_info: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
    };

    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      userData.profile = profile;
    }

    // Get bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        *,
        products (name, description, original_price),
        drops (name, status),
        pickup_points (name, address, city)
      `)
      .eq('user_id', user.id);

    if (bookings && bookings.length > 0) {
      userData.bookings = bookings;
    }

    // Get user interests
    const { data: interests } = await supabase
      .from('user_interests')
      .select(`
        *,
        products (name, description),
        pickup_points (name, city)
      `)
      .eq('user_id', user.id);

    if (interests && interests.length > 0) {
      userData.interests = interests;
    }

    // Get payment methods (without sensitive data)
    const { data: paymentMethods } = await supabase
      .from('payment_methods')
      .select('id, card_brand, card_last4, card_exp_month, card_exp_year, is_default, status, created_at')
      .eq('user_id', user.id);

    if (paymentMethods && paymentMethods.length > 0) {
      userData.payment_methods = paymentMethods;
    }

    // Get notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (notifications && notifications.length > 0) {
      userData.notifications = notifications;
    }

    // Get user consents
    const { data: consents } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id);

    if (consents && consents.length > 0) {
      userData.consents = consents;
    }

    // Get activity logs
    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (activityLogs && activityLogs.length > 0) {
      userData.activity_logs = activityLogs;
    }

    // Add export metadata
    userData.export_info = {
      exported_at: new Date().toISOString(),
      export_format: 'JSON',
      gdpr_compliant: true,
    };

    console.log('✅ Data export completed successfully');
    console.log('📊 Data summary:', {
      bookings: bookings?.length || 0,
      interests: interests?.length || 0,
      payment_methods: paymentMethods?.length || 0,
      notifications: notifications?.length || 0,
      consents: consents?.length || 0,
      activity_logs: activityLogs?.length || 0,
    });

    // ============================================================================
    // EMAIL SENDING (OPTIONAL - REQUIRES EMAIL SERVICE CONFIGURATION)
    // ============================================================================
    // 
    // To enable automatic email sending, uncomment the code below and configure
    // an email service (Resend, SendGrid, AWS SES, etc.)
    // 
    // See docs/EMAIL_SERVICE_SETUP.md for detailed instructions
    //
    // Example with Resend:
    // ----------------------------------------------------------------------------
    /*
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      try {
        console.log('📧 Sending email to:', user.email);
        
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'noreply@tuodominio.com', // Replace with your verified domain
            to: user.email,
            subject: 'I Tuoi Dati Personali - Esportazione GDPR',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
                  pre { background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
                  .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">🔒 Esportazione Dati GDPR</h1>
                  </div>
                  <div class="content">
                    <h2>Ciao!</h2>
                    <p>Come richiesto, abbiamo esportato tutti i tuoi dati personali in formato JSON.</p>
                    
                    <p><strong>Cosa contiene questo file:</strong></p>
                    <ul>
                      <li>Informazioni del profilo</li>
                      <li>Prenotazioni e ordini</li>
                      <li>Interessi e preferenze</li>
                      <li>Metodi di pagamento (solo ultimi 4 cifre)</li>
                      <li>Notifiche</li>
                      <li>Consensi GDPR</li>
                      <li>Log delle attività</li>
                    </ul>

                    <p>Puoi scaricare il file allegato o visualizzare i dati qui sotto.</p>

                    <details>
                      <summary style="cursor: pointer; font-weight: bold; margin: 10px 0;">📄 Visualizza Dati (clicca per espandere)</summary>
                      <pre>${JSON.stringify(userData, null, 2)}</pre>
                    </details>

                    <div class="footer">
                      <p><strong>⚠️ Importante:</strong></p>
                      <ul>
                        <li>Questi dati sono personali e sensibili. Conservali in modo sicuro.</li>
                        <li>Se non hai richiesto questa esportazione, contattaci immediatamente.</li>
                        <li>Questa esportazione è conforme al GDPR (Regolamento UE 2016/679).</li>
                      </ul>
                      <p>Per qualsiasi domanda, contattaci tramite l'app.</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
            attachments: [
              {
                filename: `dati_personali_${new Date().toISOString().split('T')[0]}.json`,
                content: btoa(JSON.stringify(userData, null, 2)),
              },
            ],
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('❌ Error sending email:', errorText);
          throw new Error(`Failed to send email: ${errorText}`);
        }

        const emailResult = await emailResponse.json();
        console.log('✅ Email sent successfully:', emailResult);

        // Update the data request with email sent status
        await supabase
          .from('data_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            notes: `Data exported and email sent successfully to ${user.email}`,
          })
          .eq('user_id', user.id)
          .eq('request_type', 'export')
          .eq('status', 'processing');

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Esportazione completata! Controlla la tua email.',
            email_sent: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (emailError) {
        console.error('❌ Exception sending email:', emailError);
        // Continue even if email fails - return data to client
      }
    } else {
      console.log('ℹ️ RESEND_API_KEY not configured - email sending disabled');
    }
    */
    // ============================================================================

    // Update the data request to completed
    await supabase
      .from('data_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: 'Data exported successfully (returned to client)',
      })
      .eq('user_id', user.id)
      .eq('request_type', 'export')
      .eq('status', 'processing');

    // Return data directly to client since email is not configured
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Esportazione completata con successo',
        data: userData,
        email_sent: false,
        note: 'Per abilitare l\'invio automatico via email, configura un servizio email. Vedi docs/EMAIL_SERVICE_SETUP.md',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in export-user-data:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Errore durante l\'esportazione dei dati'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
