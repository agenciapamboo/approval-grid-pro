-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar cron job para executar auto-approve-contents a cada 5 minutos
SELECT cron.schedule(
  'auto-publish-contents',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT net.http_post(
    url:='https://sgarwrreywadxsodnxng.supabase.co/functions/v1/auto-approve-contents',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnYXJ3cnJleXdhZHhzb2RueG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDAxMTMsImV4cCI6MjA3NDk3NjExM30.PhZjoK6J-2zg2YGMueOfGwrxI4GkqKEmhCfJUNAjeqo'
    ),
    body:=jsonb_build_object('time', now()::text)
  ) as request_id;
  $$
);