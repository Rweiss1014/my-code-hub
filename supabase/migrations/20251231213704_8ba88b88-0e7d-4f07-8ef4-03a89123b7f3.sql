-- Remove the overly permissive "System can insert notifications" policy
-- The notify_admins_new_submission() function uses SECURITY DEFINER, 
-- so it can still insert notifications without this policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;