import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const JSEARCH_API_KEY = Deno.env.get("JSEARCH_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SEARCH_TERMS = [
  "Learning and Development Manager",
  "L&D Manager", 
  "Training Manager",
  "Instructional Designer",
  "Corporate Trainer",
  "Sales Enablement",
  "Talent Development",
  "Learning Director",
  "Training Director",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { searchTerms, location } = body;
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const termsToSearch = searchTerms || DEFAULT_SEARCH_TERMS;
    const searchLocation = location || "Remote";
    
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalFound = 0;

    for (const searchTerm of termsToSearch) {
      const query = encodeURIComponent(`${searchTerm} in ${searchLocation}`);
      console.log(`Searching JSearch for: ${query}`);
      
      const response = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${query}&num_pages=1`,
        {
          headers: {
            "X-RapidAPI-Key": JSEARCH_API_KEY!,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`JSearch API error for "${searchTerm}":`, response.status, errorText);
        continue; // Skip this term but continue with others
      }

      const data = await response.json();
      const jobCount = data.data?.length || 0;
      console.log(`JSearch returned ${jobCount} jobs for "${searchTerm}"`);
      totalFound += jobCount;

      for (const job of data.data || []) {
        const applyUrl = job.job_apply_link || job.job_google_link;
        const externalId = job.job_id;
        const publisher = job.job_publisher || "JSearch";
        
        if (!applyUrl || !externalId) {
          console.log("Skipping job - no apply URL or ID:", job.job_title);
          totalSkipped++;
          continue;
        }

        // Skip Adzuna jobs
        if (publisher.toLowerCase().includes('adzuna')) {
          console.log("Skipping Adzuna job:", job.job_title);
          totalSkipped++;
          continue;
        }

        // Check if job already exists
        const { data: existing } = await supabase
          .from("jobs")
          .select("id")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existing) {
          console.log("Skipping duplicate:", job.job_title);
          totalSkipped++;
          continue;
        }

        // Build salary string
        let salary: string | null = null;
        if (job.job_min_salary && job.job_max_salary) {
          salary = `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`;
        } else if (job.job_salary_period && job.job_min_salary) {
          salary = `$${job.job_min_salary.toLocaleString()} per ${job.job_salary_period}`;
        }

        // Build location string
        let jobLocation = "Unknown";
        if (job.job_city && job.job_state) {
          jobLocation = `${job.job_city}, ${job.job_state}`;
        } else if (job.job_city) {
          jobLocation = job.job_city;
        } else if (job.job_country) {
          jobLocation = job.job_country;
        }
        
        if (job.job_is_remote) {
          jobLocation = jobLocation === "Unknown" ? "Remote" : `Remote in ${jobLocation}`;
        }

        const { error: insertError } = await supabase.from("jobs").insert({
          title: job.job_title,
          company: job.employer_name,
          location: jobLocation,
          apply_url: applyUrl,
          salary: salary,
          description: job.job_description?.substring(0, 2000),
          source: job.job_publisher || "JSearch",
          external_id: externalId,
          category: "Learning & Development",
          location_type: job.job_is_remote ? "Remote" : "On-site",
          employment_type: job.job_employment_type || "Full-time",
          posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
        });

        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          totalInserted++;
          console.log("Inserted:", job.job_title, "at", job.employer_name);
        }
      }
      
      // Add a small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Scrape complete: ${totalInserted} inserted, ${totalSkipped} skipped, ${totalFound} total found`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: totalInserted, 
        skipped: totalSkipped,
        total_found: totalFound,
        terms_searched: termsToSearch.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});