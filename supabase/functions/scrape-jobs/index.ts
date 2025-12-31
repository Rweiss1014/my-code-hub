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

    // L&D job titles to search for
    const ldJobTitles = [
      // Core instructional roles
      'Instructional Designer',
      'Learning Experience Designer',
      'Curriculum Designer',
      'Learning Architect',
      'Learning Consultant',
      // Content and media focused
      'eLearning Developer',
      'Multimedia Designer Learning',
      'Learning Media Specialist',
      // Technical and platform roles
      'Learning Technologist',
      'LMS Administrator',
      'Learning Systems Manager',
      // Strategy and leadership
      'L&D Manager',
      'Learning Program Manager',
      'Director Learning Development',
      'Workforce Development Manager',
      // Facilitation and delivery
      'Corporate Trainer',
      'Technical Trainer',
      'Enablement Specialist',
      // Performance and capability
      'Performance Consultant',
      'Organizational Development Specialist',
      'Talent Development Specialist',
      // Emerging roles
      'Learning Product Manager',
      'AI Learning Designer',
    ];

    // Build search queries combining job titles with locations
    const searchQueries = ldJobTitles.flatMap(title => [
      `"${title}" Orlando FL`,
      `"${title}" remote`,
    ]);

    // Limit to avoid rate limiting - pick a subset of queries
    const selectedQueries = searchQueries.slice(0, 20);
    
    for (const query of selectedQueries) {
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

    // Extract location - look for actual city, state patterns in the content
    let location = 'Remote';
    
    // Look for specific location patterns like "City, ST" or "City, State"
    const locationPatterns = [
      // Match "Location: City, ST" or "Location City, ST"
      /(?:location|located|loc)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})/i,
      // Match common location formats in job listings
      /(?:in|at|based in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})/i,
      // Match standalone "City, ST" patterns (common in Indeed/LinkedIn)
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:CA|FL|TX|NY|WA|IL|PA|OH|GA|NC|MI|NJ|VA|AZ|MA|TN|IN|MO|MD|WI|MN|CO|AL|SC|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|DC|VT|WY))\b/,
      // Match "City, Full State Name"
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:California|Florida|Texas|New York|Washington|Illinois|Pennsylvania|Ohio|Georgia|North Carolina|Michigan|New Jersey|Virginia|Arizona|Massachusetts|Tennessee|Indiana|Missouri|Maryland|Wisconsin|Minnesota|Colorado|Alabama|South Carolina|Louisiana|Kentucky|Oregon|Oklahoma|Connecticut|Utah|Iowa|Nevada|Arkansas|Mississippi|Kansas|New Mexico|Nebraska|West Virginia|Idaho|Hawaii|New Hampshire|Maine|Montana|Rhode Island|Delaware|South Dakota|North Dakota|Alaska|Vermont|Wyoming))\b/i,
    ];
    
    for (const pattern of locationPatterns) {
      const match = markdown.match(pattern) || description.match(pattern);
      if (match) {
        location = match[1].trim();
        break;
      }
    }
    
    // If still no location found but it's remote, that's fine
    if (location === 'Remote' && !isRemote) {
      // Try to find any city mention as a fallback
      const cityMatch = markdown.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
      if (cityMatch) {
        location = `${cityMatch[1]}, ${cityMatch[2]}`;
      }
    }

    // Determine employment type
    let employmentType = 'Full-time';
    if (markdown.toLowerCase().includes('part-time') || title.toLowerCase().includes('part-time')) {
      employmentType = 'Part-time';
    } else if (markdown.toLowerCase().includes('contract')) {
      employmentType = 'Contract';
    }

    // Extract salary if present - prioritize explicit salary patterns over mentions in titles
    let salary: string | undefined;
    // Look for salary ranges with context (e.g., "$75 - $85 per hour", "$120,000 - $150,000 a year")
    const salaryPatterns = [
      /\$[\d,]+(?:\.\d{2})?\s*(?:-|to)\s*\$[\d,]+(?:\.\d{2})?\s*(?:per|a|\/)\s*(?:hour|hr|year|annually|month)/i,
      /\$[\d,]+(?:\.\d{2})?\s*(?:per|a|\/)\s*(?:hour|hr|year|annually|month)/i,
      /\$[\d,]+(?:\.\d{2})?\s*(?:-|to)\s*\$[\d,]+(?:\.\d{2})?\s*(?:hourly|yearly|annual)/i,
    ];
    
    for (const pattern of salaryPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        salary = match[0];
        break;
      }
    }
    
    // Skip salary if it's likely from a title/aggregator page (contains "k Jobs" pattern)
    if (!salary) {
      const fallbackMatch = markdown.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/i);
      if (fallbackMatch && !fallbackMatch[0].includes('k') && !title.includes(fallbackMatch[0])) {
        salary = fallbackMatch[0];
      }
    }

    // Extract posted date
    let postedDateStr: string | undefined;
    const postedMatch = markdown.match(/(?:posted|active)\s*(\d+\s*(?:day|week|month|hour)s?\s*ago)/i) ||
                       markdown.match(/(\d+\s*(?:day|week|month|hour)s?\s*ago)/i) ||
                       markdown.match(/(just\s*posted|today|just\s*now)/i);
    if (postedMatch) {
      postedDateStr = postedMatch[1] || postedMatch[0];
    }

    // Extract the actual job URL - look for direct job links in the content
    let applyUrl = url;
    
    // For Indeed, look for the actual job view link
    if (source === 'Indeed') {
      const indeedJobMatch = markdown.match(/https?:\/\/(?:www\.)?indeed\.com\/viewjob\?[^\s\)\"<>]+/i) ||
                             markdown.match(/https?:\/\/(?:www\.)?indeed\.com\/rc\/clk[^\s\)\"<>]+/i) ||
                             markdown.match(/https?:\/\/(?:www\.)?indeed\.com\/applystart[^\s\)\"<>]+/i);
      if (indeedJobMatch) {
        applyUrl = indeedJobMatch[0];
      }
    }
    
    // For LinkedIn, look for the actual job posting link
    if (source === 'LinkedIn') {
      const linkedinJobMatch = markdown.match(/https?:\/\/(?:www\.)?linkedin\.com\/jobs\/view\/\d+[^\s\)\"<>]*/i);
      if (linkedinJobMatch) {
        applyUrl = linkedinJobMatch[0];
      }
    }
    
    // Create external ID from the apply URL for better deduplication
    const externalId = applyUrl.replace(/[^a-zA-Z0-9]/g, '').substring(0, 100);

    return {
      job: {
        title: cleanTitle || 'L&D Position',
        company,
        location,
        locationType,
        employmentType,
        salary,
        description: description || markdown.substring(0, 500),
        applyUrl,
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
