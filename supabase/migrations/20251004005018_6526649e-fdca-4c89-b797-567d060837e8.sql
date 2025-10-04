-- Habilitar extensões necessárias para cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job de cron para executar auto-aprovação diariamente às 3h (horário de São Paulo)
-- Nota: O servidor Supabase usa UTC, então 3h em São Paulo (UTC-3) = 6h UTC
SELECT cron.schedule(
  'auto-approve-expired-contents',
  '0 6 * * *', -- Às 6h UTC = 3h São Paulo
  $$
  SELECT net.http_post(
    url := 'https://sgarwrreywadxsodnxng.supabase.co/functions/v1/auto-approve-contents',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnYXJ3cnJleXdhZHhzb2RueG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDAxMTMsImV4cCI6MjA3NDk3NjExM30.PhZjoK6J-2zg2YGMueOfGwrxI4GkqKEmhCfJUNAjeqo"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);