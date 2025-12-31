import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { searchTerm, location } = body;

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Build Indeed search URL
    const encodedTerm = encodeURIComponent(searchTerm || "Learning and Development");
    const encodedLocation = encodeURIComponent(location || "Remote");
    const indeedUrl = `https://www.indeed.com/jobs?q=${encodedTerm}&l=${encodedLocation}`;

    console.log(`Scraping: ${indeedUrl}`);

    // Use Firecrawl's scrape endpoint with extraction
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: indeedUrl,
        formats: ["extract"],
        extract: {
          schema: {
            type: "object",
            properties: {
              jobs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Job title" },
                    company: { type: "string", description: "Company name" },
                    location: { type: "string", description: "Job location" },
                    apply_url: { type: "string", description: "Direct URL to the job posting" },
                    salary: { type: "string", description: "Salary if listed" },
                    description: { type: "string", description: "Job description snippet" },
                  },
                  required: ["title", "company", "apply_url"]
                }
              }
            },
            required: ["jobs"]
          },
          prompt: `Extract all job listings from this Indeed search results page.
For each job, extract:
- title: The job title
- company: Company name
- location: Job location
- apply_url: THE DIRECT LINK TO THE JOB POSTING. This is critical - look for links containing 'viewjob?jk=' or 'rc/clk?jk=' with a job key. Do NOT return the search page URL.
- salary: Salary if shown
- description: Brief job description

The apply_url MUST be the link to view that specific job, not the search results page.`
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Firecrawl error: ${error}`);
    }

    const data = await response.json();
    console.log("Firecrawl response:", JSON.stringify(data.extract?.jobs?.length || 0), "jobs found");

    // Process and insert jobs
    let insertedCount = 0;
    let skippedCount = 0;

    if (data.extract?.jobs) {
      for (const job of data.extract.jobs) {
        const applyUrl = normalizeIndeedUrl(job.apply_url);

        // Skip if no valid URL
        if (!applyUrl) {
          console.log("Skipping job - no valid URL:", job.title);
          skippedCount++;
          continue;
        }

        // Generate external_id from the job URL for deduplication
        const externalId = extractJobKey(applyUrl) || applyUrl;

        // Check if job already exists
        const { data: existing } = await supabase
          .from("jobs")
          .select("id")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existing) {
          console.log("Skipping duplicate:", job.title);
          skippedCount++;
          continue;
        }

        // Insert new job
        const { error: insertError } = await supabase.from("jobs").insert({
          title: job.title || "Unknown Title",
          company: job.company || "Unknown Company",
          location: job.location || location || "Remote",
          apply_url: applyUrl,
          salary: job.salary || null,
          description: job.description || null,
          source: "Indeed",
          external_id: externalId,
          category: "Learning & Development",
          location_type: job.location?.toLowerCase().includes("remote") ? "Remote" : "On-site",
          employment_type: "Full-time",
          posted_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          insertedCount++;
          console.log("Inserted job:", job.title, "at", job.company);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        skipped: skippedCount,
        total_found: data.extract?.jobs?.length || 0
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

// Normalize Indeed job URLs to ensure they're direct links
function normalizeIndeedUrl(url: string): string {
  if (!url) return "";

  // If it's already a full Indeed URL, return it
  if (url.startsWith("https://www.indeed.com/")) {
    return url;
  }

  if (url.startsWith("http")) {
    return url;
  }

  // If it's a relative Indeed URL, make it absolute
  if (url.startsWith("/")) {
    return `https://www.indeed.com${url}`;
  }

  // If we just have a job key (jk), construct the URL
  if (url.match(/^[a-f0-9]{16}$/i)) {
    return `https://www.indeed.com/viewjob?jk=${url}`;
  }

  return url;
}

// Extract the job key from an Indeed URL for deduplication
function extractJobKey(url: string): string | null {
  const match = url.match(/jk=([a-f0-9]+)/i);
  return match ? match[1] : null;
}
