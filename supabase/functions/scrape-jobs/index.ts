import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  locationType: string;
  employmentType: string;
  salary?: string;
  description?: string;
  applyUrl?: string;
  externalId: string;
  source: string;
  postedDate?: Date;
}

function isWithinLast30Days(dateStr: string | undefined): boolean {
  if (!dateStr) return true; // If no date found, include the job
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Parse relative dates like "1 day ago", "2 weeks ago", etc.
  const lowerDate = dateStr.toLowerCase();
  
  if (lowerDate.includes('just posted') || lowerDate.includes('today') || lowerDate.includes('just now')) {
    return true;
  }
  
  const daysMatch = lowerDate.match(/(\d+)\s*day/);
  if (daysMatch) {
    return parseInt(daysMatch[1]) <= 30;
  }
  
  const weeksMatch = lowerDate.match(/(\d+)\s*week/);
  if (weeksMatch) {
    return parseInt(weeksMatch[1]) <= 4;
  }
  
  const monthsMatch = lowerDate.match(/(\d+)\s*month/);
  if (monthsMatch) {
    return parseInt(monthsMatch[1]) < 1;
  }
  
  // Try parsing as absolute date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed >= thirtyDaysAgo;
  }
  
  return true; // Default to including if we can't parse
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting job scrape for L&D jobs in Orlando, FL and Remote...');

    const jobs: ScrapedJob[] = [];

    // Search Indeed for L&D jobs
    const indeedSearchQueries = [
      'Learning Development Orlando FL',
      'Training Development Orlando Florida',
      'Instructional Designer Orlando FL remote',
      'L&D Specialist Orlando remote',
    ];

    for (const query of indeedSearchQueries) {
      console.log(`Searching: ${query}`);
      
      try {
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `${query} site:indeed.com OR site:linkedin.com/jobs`,
            limit: 10,
            scrapeOptions: {
              formats: ['markdown'],
            },
          }),
        });

        const searchData = await searchResponse.json();
        console.log(`Search results for "${query}":`, searchData.success ? searchData.data?.length || 0 : 'failed');

        if (searchData.success && searchData.data) {
          for (const result of searchData.data) {
            const { job, postedDateStr } = parseJobFromResult(result);
            if (job && isWithinLast30Days(postedDateStr)) {
              jobs.push(job);
            } else if (job && !isWithinLast30Days(postedDateStr)) {
              console.log(`Skipping job "${job.title}" - posted more than 30 days ago: ${postedDateStr}`);
            }
          }
        }
      } catch (err) {
        console.error(`Error searching for "${query}":`, err);
      }
    }

    // Deduplicate jobs by external ID
    const uniqueJobs = jobs.reduce((acc, job) => {
      if (!acc.find(j => j.externalId === job.externalId)) {
        acc.push(job);
      }
      return acc;
    }, [] as ScrapedJob[]);

    console.log(`Found ${uniqueJobs.length} unique jobs`);

    // Insert jobs into database
    let inserted = 0;
    for (const job of uniqueJobs) {
      const { error } = await supabase
        .from('jobs')
        .upsert({
          title: job.title,
          company: job.company,
          location: job.location,
          location_type: job.locationType,
          employment_type: job.employmentType,
          salary: job.salary,
          category: 'Learning & Development',
          description: job.description,
          source: job.source,
          apply_url: job.applyUrl,
          external_id: job.externalId,
        }, {
          onConflict: 'external_id,source',
        });

      if (!error) {
        inserted++;
      } else {
        console.error('Error inserting job:', error);
      }
    }

    console.log(`Successfully inserted/updated ${inserted} jobs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scraped ${uniqueJobs.length} jobs, inserted ${inserted}`,
        jobs: uniqueJobs 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-jobs function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseJobFromResult(result: any): { job: ScrapedJob | null; postedDateStr?: string } {
  try {
    const url = result.url || '';
    const title = result.title || '';
    const markdown = result.markdown || '';
    const description = result.description || '';

    // Skip non-job pages
    if (!title || title.toLowerCase().includes('search') || title.toLowerCase().includes('login')) {
      return { job: null };
    }

    // Determine source
    const source = url.includes('linkedin.com') ? 'LinkedIn' : 
                   url.includes('indeed.com') ? 'Indeed' : 'Other';

    // Extract company from title or markdown
    let company = 'Unknown Company';
    const companyMatch = title.match(/at\s+(.+?)(?:\s*[-|]|$)/i) || 
                        title.match(/[-|]\s*(.+?)(?:\s*[-|]|$)/);
    if (companyMatch) {
      company = companyMatch[1].trim();
    }

    // Clean up title
    let cleanTitle = title
      .replace(/\s*[-|].+$/, '')
      .replace(/\s*at\s+.+$/i, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 5) {
      cleanTitle = title.split(/[-|]/)[0].trim();
    }

    // Determine location type
    const isRemote = markdown.toLowerCase().includes('remote') || 
                     title.toLowerCase().includes('remote') ||
                     description.toLowerCase().includes('remote');
    
    const locationType = isRemote ? 'Remote' : 'On-site';

    // Extract location
    let location = 'Orlando, FL';
    const locationMatch = markdown.match(/Orlando,?\s*FL/i) || 
                         markdown.match(/Florida/i);
    if (locationMatch) {
      location = 'Orlando, FL';
    } else if (isRemote) {
      location = 'Remote';
    }

    // Determine employment type
    let employmentType = 'Full-time';
    if (markdown.toLowerCase().includes('part-time') || title.toLowerCase().includes('part-time')) {
      employmentType = 'Part-time';
    } else if (markdown.toLowerCase().includes('contract')) {
      employmentType = 'Contract';
    }

    // Extract salary if present
    let salary: string | undefined;
    const salaryMatch = markdown.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|\/)\s*(?:year|hour|hr|annually))?/i);
    if (salaryMatch) {
      salary = salaryMatch[0];
    }

    // Extract posted date
    let postedDateStr: string | undefined;
    const postedMatch = markdown.match(/(?:posted|active)\s*(\d+\s*(?:day|week|month|hour)s?\s*ago)/i) ||
                       markdown.match(/(\d+\s*(?:day|week|month|hour)s?\s*ago)/i) ||
                       markdown.match(/(just\s*posted|today|just\s*now)/i);
    if (postedMatch) {
      postedDateStr = postedMatch[1] || postedMatch[0];
    }

    // Create external ID from URL
    const externalId = url.replace(/[^a-zA-Z0-9]/g, '').substring(0, 100);

    return {
      job: {
        title: cleanTitle || 'L&D Position',
        company,
        location,
        locationType,
        employmentType,
        salary,
        description: description || markdown.substring(0, 500),
        applyUrl: url,
        externalId,
        source,
      },
      postedDateStr,
    };
  } catch (err) {
    console.error('Error parsing job:', err);
    return { job: null };
  }
}
