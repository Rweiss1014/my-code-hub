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

function isValidJobUrl(url: string): boolean {
  // Check if it's an actual job page, not a search results page
  if (url.includes('indeed.com')) {
    return url.includes('/viewjob') || url.includes('/rc/clk') || url.includes('/pagead') || url.includes('jk=');
  }
  if (url.includes('linkedin.com')) {
    return url.includes('/jobs/view/');
  }
  return false;
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
    
    // Collect job URLs from search first
    const jobUrls: Set<string> = new Set();
    
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
            limit: 5,
          }),
        });

        const searchData = await searchResponse.json();
        console.log(`Search results for "${query}":`, searchData.success ? searchData.data?.length || 0 : 'failed');

        if (searchData.success && searchData.data) {
          for (const result of searchData.data) {
            const url = result.url || '';
            // Only add actual job page URLs, not search result pages
            if (isValidJobUrl(url)) {
              jobUrls.add(url);
            }
          }
        }
      } catch (err) {
        console.error(`Error searching for "${query}":`, err);
      }
    }

    console.log(`Found ${jobUrls.size} unique job URLs to scrape`);

    // Now scrape each individual job page
    const jobUrlArray = Array.from(jobUrls).slice(0, 50); // Limit to 50 jobs to avoid timeout
    
    for (const jobUrl of jobUrlArray) {
      try {
        console.log(`Scraping job page: ${jobUrl}`);
        
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: jobUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeResponse.json();
        
        if (scrapeData.success && scrapeData.data) {
          const { job, postedDateStr } = parseJobFromScrapedPage(scrapeData.data, jobUrl);
          if (job && isWithinLast30Days(postedDateStr)) {
            jobs.push(job);
            console.log(`Parsed job: ${job.title} at ${job.company}`);
          } else if (job && !isWithinLast30Days(postedDateStr)) {
            console.log(`Skipping job "${job.title}" - posted more than 30 days ago: ${postedDateStr}`);
          }
        }
      } catch (err) {
        console.error(`Error scraping ${jobUrl}:`, err);
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

function parseJobFromScrapedPage(data: any, jobUrl: string): { job: ScrapedJob | null; postedDateStr?: string } {
  try {
    const markdown = data.markdown || '';
    const metadata = data.metadata || {};
    const pageTitle = metadata.title || '';

    // Determine source
    const source = jobUrl.includes('linkedin.com') ? 'LinkedIn' : 
                   jobUrl.includes('indeed.com') ? 'Indeed' : 'Other';

    // Extract job title - for Indeed/LinkedIn, it's usually the first heading or page title
    let title = '';
    
    // Try to get title from page title first
    if (pageTitle) {
      // Indeed format: "Job Title - Company Name | Indeed.com"
      // LinkedIn format: "Job Title | Company Name | LinkedIn"
      title = pageTitle.split(' - ')[0].split(' | ')[0].trim();
    }
    
    // Fallback: look for first H1 in markdown
    if (!title || title.length < 5) {
      const h1Match = markdown.match(/^#\s+(.+)$/m);
      if (h1Match) {
        title = h1Match[1].trim();
      }
    }

    if (!title || title.length < 5) {
      console.log('Could not extract title from page');
      return { job: null };
    }

    // Extract company
    let company = 'Unknown Company';
    
    // Try page title for company
    if (pageTitle.includes(' - ')) {
      const parts = pageTitle.split(' - ');
      if (parts.length >= 2) {
        company = parts[1].split(' | ')[0].trim();
      }
    } else if (pageTitle.includes(' | ')) {
      const parts = pageTitle.split(' | ');
      if (parts.length >= 2) {
        company = parts[1].trim();
      }
    }
    
    // Look for company in markdown if not found
    if (company === 'Unknown Company') {
      const companyPatterns = [
        /(?:company|employer)[:\s]+([^\n]+)/i,
        /(?:at|@)\s+([A-Z][A-Za-z\s&]+?)(?:\s*[-–|]|\s*\n)/,
      ];
      for (const pattern of companyPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          company = match[1].trim();
          break;
        }
      }
    }

    // Clean up company name
    company = company.replace(/\s*\|.*$/, '').replace(/Indeed\.com.*$/i, '').replace(/LinkedIn.*$/i, '').trim();

    // Determine if remote
    const isRemote = /\bremote\b/i.test(markdown) || /\bremote\b/i.test(pageTitle);
    const locationType = isRemote ? 'Remote' : 'On-site';

    // Extract location - look for specific location patterns
    let location = isRemote ? 'Remote' : 'Unknown';
    
    const locationPatterns = [
      // Indeed-style location section
      /location[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/i,
      // LinkedIn-style location
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\s*(?:\(|·|•)/,
      // General City, ST pattern (be more specific to avoid false matches)
      /(?:^|\n|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:CA|FL|TX|NY|WA|IL|PA|OH|GA|NC|MI|NJ|VA|AZ|MA|TN|IN|MO|MD|WI|MN|CO|AL|SC|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|DC|VT|WY))(?:\s|$|\n)/,
    ];
    
    for (const pattern of locationPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        location = match[1].trim();
        break;
      }
    }

    // Employment type
    let employmentType = 'Full-time';
    if (/\bpart[- ]?time\b/i.test(markdown)) {
      employmentType = 'Part-time';
    } else if (/\bcontract\b/i.test(markdown)) {
      employmentType = 'Contract';
    }

    // Extract salary - look for explicit salary patterns
    let salary: string | undefined;
    const salaryPatterns = [
      /\$[\d,]+(?:\.\d{2})?\s*(?:-|to|–)\s*\$[\d,]+(?:\.\d{2})?\s*(?:per|a|\/|an)\s*(?:hour|hr|year|yr|annually|month)/i,
      /\$[\d,]+(?:\.\d{2})?\s*(?:per|a|\/|an)\s*(?:hour|hr|year|yr|annually|month)/i,
      /(?:salary|pay|compensation)[:\s]*\$[\d,]+(?:\s*(?:-|to|–)\s*\$[\d,]+)?/i,
      /\$[\d,]+(?:\.\d{2})?\s*(?:-|to|–)\s*\$[\d,]+(?:\.\d{2})?\s*(?:hourly|yearly|annually)/i,
    ];
    
    for (const pattern of salaryPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        salary = match[0].trim();
        break;
      }
    }

    // Extract posted date
    let postedDateStr: string | undefined;
    const postedPatterns = [
      /(?:posted|active)\s*(\d+\s*(?:day|week|month|hour)s?\s*ago)/i,
      /(\d+\s*(?:day|week|month|hour)s?\s*ago)/i,
      /(just\s*posted|today|just\s*now)/i,
    ];
    for (const pattern of postedPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        postedDateStr = match[1] || match[0];
        break;
      }
    }

    // Get description - first 500 chars of main content
    const description = markdown.substring(0, 500).replace(/^#+\s+.+$/gm, '').trim();

    // Create external ID from the URL for deduplication
    const externalId = jobUrl.replace(/[^a-zA-Z0-9]/g, '').substring(0, 100);

    return {
      job: {
        title,
        company,
        location,
        locationType,
        employmentType,
        salary,
        description,
        applyUrl: jobUrl,
        externalId,
        source,
      },
      postedDateStr,
    };
  } catch (err) {
    console.error('Error parsing job page:', err);
    return { job: null };
  }
}
