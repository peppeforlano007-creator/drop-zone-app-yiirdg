/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
/* eslint-enable import/no-unresolved */

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: drops, error: dropsError } = await supabase
      .from('drops')
      .select('id, name, end_time')
      .eq('status', 'active')
      .gte('end_time', now)
      .lte('end_time', in24h);

    if (dropsError) throw dropsError;
    if (!drops || drops.length === 0) {
      return new Response(JSON.stringify({ message: 'No drops ending soon', notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalNotified = 0;
    let totalSkipped = 0;

    for (const drop of drops) {
      const hoursLeft = Math.round((new Date(drop.end_time).getTime() - Date.now()) / (1000 * 60 * 60));

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('drop_id', drop.id)
        .in('status', ['pending', 'confirmed']);

      if (bookingsError) {
        console.error(`Error fetching bookings for drop ${drop.id}:`, bookingsError);
        continue;
      }

      if (!bookings || bookings.length === 0) continue;

      const userIds = [...new Set(bookings.map((b: any) => b.user_id))];

      for (const userId of userIds) {
        // Check duplicati: SOLO tipo drop_ending — notifiche drop_activated non bloccano mai
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'drop_ending')
          .eq('related_id', drop.id)
          .maybeSingle();

        if (existing) {
          totalSkipped++;
          continue;
        }

        const title = `⏰ Drop in Scadenza - ${drop.name}`;
        const message = `Il drop "${drop.name}" scade tra ${hoursLeft} ore! Lo sconto finale dipende dal numero di partecipanti: più persone prenotano, più lo sconto aumenta per tutti. Condividi il drop con i tuoi amici per ottenere un prezzo ancora migliore!`;

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title,
            message,
            type: 'drop_ending',
            related_id: drop.id,
            related_type: 'drop',
            read: false,
          });

        if (notifError) {
          console.error(`Error inserting notification for user ${userId}:`, notifError);
          continue;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('user_id', userId)
          .single();

        if (profile?.push_token) {
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: profile.push_token,
                sound: 'default',
                title: '⏰ Drop in Scadenza',
                body: `"${drop.name}" scade tra ${hoursLeft} ore! Più persone prenotano, più lo sconto aumenta per tutti.`,
                data: { type: 'drop_ending', dropId: drop.id },
              }),
            });
          } catch (pushError) {
            console.warn(`Push error for user ${userId}:`, pushError);
          }
        }

        totalNotified++;
      }
    }

    console.log(`notify-drop-ending: ${totalNotified} notified, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, dropsChecked: drops.length, notified: totalNotified, skipped: totalSkipped }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('notify-drop-ending error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
