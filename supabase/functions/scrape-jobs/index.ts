import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { searchTerm, location } = body;

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const encodedTerm = encodeURIComponent(searchTerm || "instructional designer");
    const encodedLocation = encodeURIComponent(location || "Remote");
    const indeedUrl = `https://www.indeed.com/jobs?q=${encodedTerm}&l=${encodedLocation}`;

    console.log(`Scraping: ${indeedUrl}`);

    // Use Firecrawl with markdown + links + json extraction
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: indeedUrl,
        formats: ["markdown", "links", "json"],
        jsonOptions: {
          schema: {
            type: "object",
            properties: {
              jobs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    company: { type: "string" },
                    location: { type: "string" },
                    job_key: { type: "string", description: "The jk parameter value from the job link, a 16-character hex string" },
                    salary: { type: "string" },
                    posted: { type: "string" },
                  },
                  required: ["title", "company", "job_key"]
                }
              }
            },
            required: ["jobs"]
          },
          prompt: "Extract all job listings visible on this Indeed search results page. For each job, find the job_key which is the 'jk' parameter in the job link (e.g., from '/rc/clk?jk=abc123def456' extract 'abc123def456'). This is a 16-character hexadecimal string."
        },
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Firecrawl API error:", error);
      throw new Error(`Firecrawl error: ${error}`);
    }

    const data = await response.json();
    console.log("Firecrawl success:", data.success);
    
    const pageData = data.data || data;
    console.log("Data keys:", Object.keys(pageData));
    
    const jobs = pageData.json?.jobs || [];
    const links = pageData.links || [];
    
    console.log(`Found ${jobs.length} jobs via JSON extraction`);
    console.log(`Found ${links.length} links on page`);

    // Extract job keys from links as primary source
    const jobKeysFromLinks = new Map<string, string>();
    for (const link of links) {
      if (typeof link === 'string') {
        const match = link.match(/jk=([a-f0-9]{16})/i);
        if (match && !jobKeysFromLinks.has(match[1])) {
          jobKeysFromLinks.set(match[1], link);
        }
      }
    }
    console.log(`Found ${jobKeysFromLinks.size} job keys from links`);

    let insertedCount = 0;
    let skippedCount = 0;

    // If JSON extraction found jobs, use those
    if (jobs.length > 0) {
      for (const job of jobs) {
        const jobKey = job.job_key?.match(/[a-f0-9]{16}/i)?.[0];
        if (!jobKey) {
          console.log("Skipping job - no valid job key:", job.title);
          skippedCount++;
          continue;
        }

        const result = await insertJob(supabase, {
          title: job.title,
          company: job.company,
          location: job.location || location,
          jobKey,
          salary: job.salary,
        });
        
        if (result === 'inserted') insertedCount++;
        else if (result === 'skipped') skippedCount++;
      }
    } else {
      // Fallback: parse markdown to extract jobs
      console.log("JSON extraction found no jobs, parsing markdown...");
      const markdown = pageData.markdown || '';
      const parsedJobs = parseJobsFromMarkdown(markdown, jobKeysFromLinks);
      console.log(`Parsed ${parsedJobs.length} jobs from markdown`);
      
      for (const job of parsedJobs) {
        const result = await insertJob(supabase, job);
        if (result === 'inserted') insertedCount++;
        else if (result === 'skipped') skippedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        skipped: skippedCount,
        total_found: jobs.length || jobKeysFromLinks.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Scraping error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

interface JobData {
  title: string;
  company: string;
  location: string;
  jobKey: string;
  salary?: string;
}

async function insertJob(supabase: any, job: JobData): Promise<'inserted' | 'skipped' | 'error'> {
  const applyUrl = `https://www.indeed.com/viewjob?jk=${job.jobKey}`;

  // Check if job already exists
  const { data: existing } = await supabase
    .from("jobs")
    .select("id")
    .eq("external_id", job.jobKey)
    .maybeSingle();

  if (existing) {
    console.log("Skipping duplicate:", job.title);
    return 'skipped';
  }

  const isRemote = job.location?.toLowerCase().includes("remote");

  const { error: insertError } = await supabase.from("jobs").insert({
    title: job.title || "Unknown Title",
    company: job.company || "Unknown Company",
    location: job.location || "Remote",
    apply_url: applyUrl,
    salary: job.salary || null,
    description: null,
    source: "Indeed",
    external_id: job.jobKey,
    category: "Learning & Development",
    location_type: isRemote ? "Remote" : "On-site",
    employment_type: "Full-time",
    posted_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return 'error';
  }
  
  console.log("Inserted:", job.title, "at", job.company, "->", applyUrl);
  return 'inserted';
}

function parseJobsFromMarkdown(markdown: string, jobKeys: Map<string, string>): JobData[] {
  const jobs: JobData[] = [];
  
  // Pattern to match job listings in Indeed's markdown format
  // Jobs often appear as: [Title](link) \n Company \n Location
  const jobBlockPattern = /\[([^\]]+)\]\(([^)]+jk=([a-f0-9]{16})[^)]*)\)[^\[]*?(?:\n\n|\n)([A-Z][^[]*?)(?=\n\[|\n\n\[|$)/gi;
  
  let match;
  while ((match = jobBlockPattern.exec(markdown)) !== null) {
    const title = match[1].trim();
    const jobKey = match[3];
    const details = match[4] || '';
    
    // Extract company - usually first line after the title
    const lines = details.split('\n').filter(l => l.trim());
    const company = lines[0]?.trim() || 'Unknown Company';
    
    // Extract location - look for City, ST pattern
    const locationMatch = details.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/);
    const location = locationMatch?.[1] || (details.toLowerCase().includes('remote') ? 'Remote' : 'Unknown');
    
    // Extract salary if present
    const salaryMatch = details.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:a|per)\s*(?:year|hour))?/i);
    
    if (title && jobKey && !title.toLowerCase().includes('salary')) {
      jobs.push({
        title,
        company,
        location,
        jobKey,
        salary: salaryMatch?.[0],
      });
    }
  }
  
  // If pattern didn't work well, try simpler approach with job keys we found
  if (jobs.length === 0 && jobKeys.size > 0) {
    console.log("Fallback: Creating basic entries from job keys");
    for (const [jobKey] of jobKeys) {
      jobs.push({
        title: "Job Listing",
        company: "See listing",
        location: "Remote",
        jobKey,
      });
    }
  }
  
  return jobs;
}
