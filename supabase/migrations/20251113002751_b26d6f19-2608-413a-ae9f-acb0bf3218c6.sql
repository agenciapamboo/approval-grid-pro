-- Drop all RPC functions related to approval_tokens system
DROP FUNCTION IF EXISTS public.validate_approval_token(p_token text);
DROP FUNCTION IF EXISTS public.get_contents_for_approval(p_token text);
DROP FUNCTION IF EXISTS public.get_content_caption_for_approval(p_token text, p_content_id uuid, p_version integer);
DROP FUNCTION IF EXISTS public.add_comment_for_approval(p_token text, p_content_id uuid, p_body text);
DROP FUNCTION IF EXISTS public.save_caption_for_approval(p_token text, p_content_id uuid, p_caption text);
DROP FUNCTION IF EXISTS public.approve_content_for_approval(p_token text, p_content_id uuid);
DROP FUNCTION IF EXISTS public.reject_content_for_approval(p_token text, p_content_id uuid, p_reason text);
DROP FUNCTION IF EXISTS public.get_comments_for_approval(p_token text, p_content_id uuid);
DROP FUNCTION IF EXISTS public.generate_approval_token(p_client_id uuid, p_month text);

-- Log cleanup in activity_log
INSERT INTO activity_log (
  entity,
  action,
  metadata,
  created_at
) VALUES (
  'system',
  'approval_token_cleanup',
  jsonb_build_object(
    'reason', 'Migrated to 2FA authentication system',
    'functions_removed', 9,
    'edge_functions_removed', 3
  ),
  now()
);