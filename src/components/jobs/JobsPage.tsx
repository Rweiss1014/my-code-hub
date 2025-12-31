import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Briefcase, Clock, DollarSign, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchJobs, scrapeJobs } from "@/lib/api/jobs";
import type { Job } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const experienceLevels = ["Entry Level", "Mid Level", "Senior", "Lead", "Director"];
const employmentTypes = ["Full-time", "Part-time", "Contract", "Freelance"];
const workLocations = ["Remote", "Hybrid", "On-site"];

const floridaRegions = [
  { name: "Central Florida", cities: ["Orlando", "Lake Mary", "Maitland", "Altamonte Springs", "Longwood", "Winter Park", "Sanford", "Celebration", "Kissimmee"] },
  { name: "Tampa Bay", cities: ["Tampa", "St. Petersburg", "Clearwater", "Brandon", "Lakeland"] },
  { name: "South Florida", cities: ["Miami", "Fort Lauderdale", "West Palm Beach", "Boca Raton", "Hialeah"] },
  { name: "North Florida", cities: ["Jacksonville", "Tallahassee", "Gainesville", "Ocala", "St. Augustine"] },
  { name: "Space Coast", cities: ["Melbourne", "Cocoa", "Titusville", "Palm Bay"] },
];

const salaryRanges = [
  { label: "Under $50k", min: 0, max: 50000 },
  { label: "$50k - $75k", min: 50000, max: 75000 },
  { label: "$75k - $100k", min: 75000, max: 100000 },
  { label: "$100k - $150k", min: 100000, max: 150000 },
  { label: "$150k+", min: 150000, max: Infinity },
];

const jobTitleCategories = [
  { name: "Instructional Designer", keywords: ["instructional designer", "instructional design"] },
  { name: "Learning Experience Designer", keywords: ["learning experience", "lxd", "lx designer"] },
  { name: "Training Specialist", keywords: ["training specialist", "training coordinator", "trainer"] },
  { name: "Curriculum Developer", keywords: ["curriculum developer", "curriculum designer", "curriculum"] },
  { name: "E-Learning Developer", keywords: ["e-learning", "elearning", "articulate", "storyline"] },
  { name: "L&D Manager", keywords: ["l&d manager", "learning manager", "training manager", "director of learning", "head of learning", "learning director", "learning program manager", "learning leader", "l&d director", "learning and development manager", "learning & development"] },
];

const JobsPage = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [selectedEmployment, setSelectedEmployment] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedSalary, setSelectedSalary] = useState<string[]>([]);
  const [selectedTitleCategory, setSelectedTitleCategory] = useState<string[]>([]);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    const data = await fetchJobs();
    setJobs(data);
    setIsLoading(false);
  };

  const handleScrape = async () => {
    setIsScraping(true);
    toast({ title: "Scraping jobs...", description: "This may take a minute." });
    
    const result = await scrapeJobs();
    
    if (result.success) {
      toast({ title: "Success!", description: result.message });
      await loadJobs();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    
    setIsScraping(false);
  };

  const toggleFilter = (value: string, selected: string[], setSelected: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  // Derive unique categories from loaded jobs
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(jobs.map(job => job.category))];
    return uniqueCategories.map((name, index) => ({
      id: String(index + 1),
      name,
    }));
  }, [jobs]);

  // Parse salary from string to get numeric value
  const parseSalary = (salaryStr: string | null): number | null => {
    if (!salaryStr) return null;
    const match = salaryStr.match(/\$?([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''));
    }
    return null;
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(job.category);
    const matchesEmployment = selectedEmployment.length === 0 || selectedEmployment.includes(job.employmentType);
    const matchesLocation = selectedLocation.length === 0 || selectedLocation.includes(job.locationType);
    
    // Florida region filter
    const matchesRegion = selectedRegions.length === 0 || selectedRegions.some(regionName => {
      const region = floridaRegions.find(r => r.name === regionName);
      if (!region) return false;
      return region.cities.some(city => job.location.toLowerCase().includes(city.toLowerCase()));
    });

    // Salary filter
    const jobSalary = parseSalary(job.salary);
    const matchesSalary = selectedSalary.length === 0 || selectedSalary.some(rangeLabel => {
      const range = salaryRanges.find(r => r.label === rangeLabel);
      if (!range || !jobSalary) return false;
      return jobSalary >= range.min && jobSalary < range.max;
    });

    // Job title category filter
    const matchesTitleCategory = selectedTitleCategory.length === 0 || selectedTitleCategory.some(catName => {
      const cat = jobTitleCategories.find(c => c.name === catName);
      if (!cat) return false;
      return cat.keywords.some(kw => job.title.toLowerCase().includes(kw.toLowerCase()));
    });

    return matchesSearch && matchesCategory && matchesEmployment && matchesLocation && matchesRegion && matchesSalary && matchesTitleCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background py-8">
        <div className="container">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">L&D Job Listings</h1>
              <p className="text-muted-foreground text-lg">
                Discover opportunities in instructional design, e-learning development, and corporate training
              </p>
            </div>
            {isAdmin && (
              <Button onClick={handleScrape} disabled={isScraping} className="gap-2">
                {isScraping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isScraping ? "Scraping..." : "Scrape New Jobs"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b border-border bg-background py-6">
        <div className="container">
          <div className="relative max-w-3xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, company, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base"
            />
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="space-y-6">
              <h2 className="font-semibold text-lg">Filters</h2>

              {/* Job Title Category Filter */}
              <div>
                <h3 className="font-medium mb-3">Job Title Category</h3>
                <div className="space-y-2">
                  {jobTitleCategories.map((cat) => (
                    <label key={cat.name} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedTitleCategory.includes(cat.name)}
                        onCheckedChange={() => toggleFilter(cat.name, selectedTitleCategory, setSelectedTitleCategory)}
                      />
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {cat.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Experience Level Filter */}
              <div>
                <h3 className="font-medium mb-3">Experience Level</h3>
                <div className="space-y-2">
                  {experienceLevels.map((level) => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedExperience.includes(level)}
                        onCheckedChange={() => toggleFilter(level, selectedExperience, setSelectedExperience)}
                      />
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {level}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Employment Type Filter */}
              <div>
                <h3 className="font-medium mb-3">Employment Type</h3>
                <div className="space-y-2">
                  {employmentTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedEmployment.includes(type)}
                        onCheckedChange={() => toggleFilter(type, selectedEmployment, setSelectedEmployment)}
                      />
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Work Location Filter */}
              <div>
                <h3 className="font-medium mb-3">Work Location</h3>
                <div className="space-y-2">
                  {workLocations.map((location) => (
                    <label key={location} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedLocation.includes(location)}
                        onCheckedChange={() => toggleFilter(location, selectedLocation, setSelectedLocation)}
                      />
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {location}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Florida Region Filter */}
              <div>
                <h3 className="font-medium mb-3">Florida Region</h3>
                <div className="space-y-2">
                  {floridaRegions.map((region) => (
                    <label key={region.name} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedRegions.includes(region.name)}
                        onCheckedChange={() => toggleFilter(region.name, selectedRegions, setSelectedRegions)}
                      />
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {region.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Salary Range Filter */}
              <div>
                <h3 className="font-medium mb-3">Salary Range</h3>
                <div className="space-y-2">
                  {salaryRanges.map((range) => (
                    <label key={range.label} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedSalary.includes(range.label)}
                        onCheckedChange={() => toggleFilter(range.label, selectedSalary, setSelectedSalary)}
                      />
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {range.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </aside>

          {/* Job Listings */}
          <main className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No jobs found matching your criteria. Jobs are automatically updated every 12 hours.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredJobs.length} jobs found
                </p>

                <div className="space-y-4">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="bg-card rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-card-hover transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1 hover:text-primary transition-colors cursor-pointer">
                        {job.title}
                      </h3>
                      <p className="text-muted-foreground mb-3">{job.company}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="text-primary font-medium">{job.locationType}</span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.employmentType}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {job.salary}
                          </span>
                        )}
                      </div>

                      <Badge variant="secondary" className="mb-4">
                        {job.category}
                      </Badge>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {job.postedAt}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">via {job.source}</span>
                      <Button 
                        size="sm" 
                        className="gap-2"
                        onClick={() => job.applyUrl && window.open(job.applyUrl, '_blank')}
                        disabled={!job.applyUrl}
                      >
                        Apply
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
