
// eslint-disable-next-line import/no-unresolved
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// eslint-disable-next-line import/no-unresolved
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

    // Update the data request to completed
    await supabase
      .from('data_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: 'Data exported successfully (file download)',
      })
      .eq('user_id', user.id)
      .eq('request_type', 'export')
      .eq('status', 'processing');

    // Return data directly to client for download
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Esportazione completata con successo',
        data: userData,
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
