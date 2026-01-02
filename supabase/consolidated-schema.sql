-- =====================================================
-- CONSOLIDATED DATABASE SCHEMA
-- Run this in a new Supabase project's SQL Editor
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =====================================================
-- 2. ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =====================================================
-- 4. TABLES
-- =====================================================

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Jobs table (scraped/approved job listings)
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'On-site',
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  salary TEXT,
  category TEXT NOT NULL DEFAULT 'Learning & Development',
  description TEXT,
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT NOT NULL,
  apply_url TEXT,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(external_id, source)
);

-- Job submissions (pending review)
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

-- Freelancer submissions (pending review)
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

-- Approved freelancers (public facing)
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

-- Notifications table
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

-- =====================================================
-- 5. INDEXES
-- =====================================================
CREATE INDEX idx_jobs_source ON public.jobs(source);
CREATE INDEX idx_jobs_location ON public.jobs(location);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Jobs policies (public read)
CREATE POLICY "Jobs are viewable by everyone" 
ON public.jobs FOR SELECT 
USING (true);

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

-- Freelancers policies (public read)
CREATE POLICY "Freelancers are viewable by everyone"
ON public.freelancers FOR SELECT
USING (true);

CREATE POLICY "Admins can manage freelancers"
ON public.freelancers FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admins on new submissions
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
  IF TG_TABLE_NAME = 'job_submissions' THEN
    notification_title := 'New Job Submission';
    notification_message := 'A new job posting "' || NEW.title || '" from ' || NEW.company || ' needs review.';
  ELSIF TG_TABLE_NAME = 'freelancer_submissions' THEN
    notification_title := 'New Freelancer Submission';
    notification_message := 'A new freelancer profile from ' || NEW.full_name || ' (' || NEW.title || ') needs review.';
  END IF;

  FOR admin_user IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (admin_user.user_id, notification_title, notification_message, 'info', '/admin');
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admins_on_job_submission
AFTER INSERT ON public.job_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_submission();

CREATE TRIGGER notify_admins_on_freelancer_submission
AFTER INSERT ON public.freelancer_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_submission();

-- =====================================================
-- 9. REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
