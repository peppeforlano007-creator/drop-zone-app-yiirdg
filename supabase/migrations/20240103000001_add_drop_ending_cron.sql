-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the notify-drop-ending Edge Function to run every hour
SELECT cron.schedule(
  'notify-drop-ending-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sippdylyuzejudmzbwdn.supabase.co/functions/v1/notify-drop-ending',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
