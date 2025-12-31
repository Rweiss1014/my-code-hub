
-- Create submission status enum
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Create freelancer_submissions table
CREATE TABLE public.freelancer_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate TEXT,
  portfolio_url TEXT,
  status submission_status NOT NULL DEFAULT 'pending',
  admin_feedback TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create job_submissions table
CREATE TABLE public.job_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'On-site',
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  salary TEXT,
  category TEXT NOT NULL DEFAULT 'Learning & Development',
  description TEXT,
  apply_url TEXT,
  status submission_status NOT NULL DEFAULT 'pending',
  admin_feedback TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.freelancer_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Freelancer submissions policies
CREATE POLICY "Users can view their own freelancer submissions"
ON public.freelancer_submissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create freelancer submissions"
ON public.freelancer_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all freelancer submissions"
ON public.freelancer_submissions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update freelancer submissions"
ON public.freelancer_submissions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Job submissions policies
CREATE POLICY "Users can view their own job submissions"
ON public.job_submissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create job submissions"
ON public.job_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all job submissions"
ON public.job_submissions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update job submissions"
ON public.job_submissions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Admins can insert notifications for any user
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create approved freelancers table (public facing)
CREATE TABLE public.freelancers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate TEXT,
  portfolio_url TEXT,
  submission_id UUID REFERENCES public.freelancer_submissions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Freelancers are viewable by everyone"
ON public.freelancers FOR SELECT
USING (true);

CREATE POLICY "Admins can manage freelancers"
ON public.freelancers FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
