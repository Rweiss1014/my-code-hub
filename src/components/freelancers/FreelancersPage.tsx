import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, DollarSign, Globe, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface Freelancer {
  id: string;
  full_name: string;
  title: string;
  bio: string | null;
  skills: string[];
  hourly_rate: string | null;
  portfolio_url: string | null;
}

const FreelancersPage = () => {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    fetchFreelancers();
  }, []);

  const fetchFreelancers = async () => {
    const { data, error } = await supabase
      .from("freelancers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFreelancers(data);
    }
    setIsLoading(false);
  };

  const toggleFilter = (value: string, selected: string[], setSelected: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  // Get unique skills from all freelancers
  const allSkills = [...new Set(freelancers.flatMap((f) => f.skills))].sort();

  const filteredFreelancers = freelancers.filter((freelancer) => {
    const matchesSearch =
      freelancer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      freelancer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      freelancer.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSkills =
      selectedSkills.length === 0 ||
      freelancer.skills.some((skill) => selectedSkills.includes(skill));
    return matchesSearch && matchesSkills;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background py-8">
        <div className="container flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">L&D Freelancer Directory</h1>
            <p className="text-muted-foreground text-lg">
              Connect with expert instructional designers, e-learning developers, and training consultants
            </p>
          </div>
          <Link to="/post-freelancer">
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Join as Freelancer
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b border-border bg-background py-6">
        <div className="container">
          <div className="relative max-w-3xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, skill, or keyword..."
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
          {allSkills.length > 0 && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                <h2 className="font-semibold text-lg">Filters</h2>

                {/* Skills Filter */}
                <div>
                  <h3 className="font-medium mb-3">Skills</h3>
                  <div className="space-y-2">
                    {allSkills.map((skill) => (
                      <label key={skill} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedSkills.includes(skill)}
                          onCheckedChange={() => toggleFilter(skill, selectedSkills, setSelectedSkills)}
                        />
                        <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {skill}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Freelancer Cards */}
          <main className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredFreelancers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No freelancers found. Be the first to join!
                </p>
                <Link to="/post-freelancer">
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Join as Freelancer
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredFreelancers.length} professionals found
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {filteredFreelancers.map((freelancer) => (
                    <article
                      key={freelancer.id}
                      className="bg-card rounded-xl border border-border p-6 hover:shadow-card-hover hover:border-primary/30 transition-all duration-200"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-semibold">
                            {getInitials(freelancer.full_name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{freelancer.full_name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{freelancer.title}</p>
                        </div>
                      </div>

                      {freelancer.hourly_rate && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                          <DollarSign className="h-4 w-4" />
                          {freelancer.hourly_rate}
                        </div>
                      )}

                      {freelancer.skills.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-2">Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {freelancer.skills.slice(0, 4).map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {freelancer.skills.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{freelancer.skills.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {freelancer.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {freelancer.bio}
                        </p>
                      )}

                      {freelancer.portfolio_url && (
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <a
                            href={freelancer.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                          <Button size="sm" variant="outline" asChild>
                            <a href={freelancer.portfolio_url} target="_blank" rel="noopener noreferrer">
                              View Portfolio
                            </a>
                          </Button>
                        </div>
                      )}
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

export default FreelancersPage;
