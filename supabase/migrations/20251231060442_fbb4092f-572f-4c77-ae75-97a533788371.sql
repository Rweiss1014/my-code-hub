
-- Function to notify admins of new submissions
CREATE OR REPLACE FUNCTION public.notify_admins_new_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Determine notification content based on table
  IF TG_TABLE_NAME = 'job_submissions' THEN
    notification_title := 'New Job Submission';
    notification_message := 'A new job posting "' || NEW.title || '" from ' || NEW.company || ' needs review.';
  ELSIF TG_TABLE_NAME = 'freelancer_submissions' THEN
    notification_title := 'New Freelancer Submission';
    notification_message := 'A new freelancer profile from ' || NEW.full_name || ' (' || NEW.title || ') needs review.';
  END IF;

  -- Insert notification for each admin
  FOR admin_user IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (admin_user.user_id, notification_title, notification_message, 'info', '/admin');
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger for job submissions
CREATE TRIGGER notify_admins_on_job_submission
AFTER INSERT ON public.job_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_submission();

-- Trigger for freelancer submissions
CREATE TRIGGER notify_admins_on_freelancer_submission
AFTER INSERT ON public.freelancer_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_submission();
