import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const JSEARCH_API_KEY = Deno.env.get("JSEARCH_API_KEY");
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

    const query = encodeURIComponent(`${searchTerm || "instructional designer"} in ${location || "Remote"}`);
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
      console.error("JSearch API error:", response.status, errorText);
      throw new Error(`JSearch error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`JSearch returned ${data.data?.length || 0} jobs`);
    
    let insertedCount = 0;
    let skippedCount = 0;

    for (const job of data.data || []) {
      const applyUrl = job.job_apply_link || job.job_google_link;
      const externalId = job.job_id;
      
      if (!applyUrl || !externalId) {
        console.log("Skipping job - no apply URL or ID:", job.job_title);
        skippedCount++;
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
        skippedCount++;
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
        insertedCount++;
        console.log("Inserted:", job.job_title, "at", job.employer_name, "->", applyUrl);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: insertedCount, 
        skipped: skippedCount,
        total_found: data.data?.length || 0 
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
