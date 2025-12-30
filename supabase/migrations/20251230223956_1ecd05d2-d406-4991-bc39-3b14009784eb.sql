-- Create jobs table for storing scraped job listings
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

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (job listings are public)
CREATE POLICY "Jobs are viewable by everyone" 
ON public.jobs 
FOR SELECT 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_jobs_source ON public.jobs(source);
CREATE INDEX idx_jobs_location ON public.jobs(location);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();