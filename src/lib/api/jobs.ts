import { supabase } from '@/integrations/supabase/client';
import type { Job } from '@/types';

export async function fetchJobs(): Promise<Job[]> {
  // Only show jobs from major, reputable job boards
  const allowedSources = [
    'Indeed', 'LinkedIn', 'ZipRecruiter', 'Glassdoor', 'Monster', 
    'SimplyHired', 'CareerBuilder', 'FlexJobs', 'Built In', 'Ladders',
    'Remote.co', 'DailyRemote', 'Workday', 'Upwork'
  ];
  
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .in('source', allowedSources)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }

  return (data || []).map(job => ({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    locationType: job.location_type,
    employmentType: job.employment_type,
    salary: job.salary || undefined,
    category: job.category,
    description: job.description || '',
    postedAt: formatTimeAgo(new Date(job.created_at)),
    source: job.source,
    applyUrl: job.apply_url || undefined,
  }));
}

interface ScrapeResult {
  success: boolean;
  message?: string;
  inserted?: number;
  skipped?: number;
  total_found?: number;
  hasMore?: boolean;
  nextBatchIndex?: number | null;
  progress?: string;
}

export async function scrapeJobs(
  onProgress?: (progress: string, totalInserted: number) => void
): Promise<{ success: boolean; message: string; totalInserted: number }> {
  let batchIndex = 0;
  let totalInserted = 0;
  let totalFound = 0;
  
  while (true) {
    const { data, error } = await supabase.functions.invoke<ScrapeResult>('scrape-jobs', {
      body: { batchIndex }
    });

    if (error) {
      console.error('Error scraping jobs:', error);
      return { 
        success: false, 
        message: error.message,
        totalInserted 
      };
    }

    if (!data?.success) {
      return { 
        success: false, 
        message: data?.message || 'Unknown error',
        totalInserted 
      };
    }

    totalInserted += data.inserted || 0;
    totalFound += data.total_found || 0;
    
    if (onProgress && data.progress) {
      onProgress(data.progress, totalInserted);
    }

    if (!data.hasMore) {
      break;
    }
    
    batchIndex = data.nextBatchIndex!;
  }

  return { 
    success: true, 
    message: `Scrape complete! Found ${totalFound} jobs, added ${totalInserted} new jobs.`,
    totalInserted 
  };
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}
