import { useState } from "react";
import { Search, MapPin, Clock, DollarSign, Linkedin, Globe, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { freelancers, categories } from "@/data/mockData";

const skills = [
  "Articulate Storyline", "Articulate Rise", "Adobe Captivate", "Camtasia",
  "After Effects", "HTML5", "JavaScript", "SCORM", "xAPI", "LMS Administration"
];

const availabilityOptions = ["Available Now", "Limited Availability"];

const FreelancersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);

  const toggleFilter = (value: string, selected: string[], setSelected: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const filteredFreelancers = freelancers.filter((freelancer) => {
    const matchesSearch = freelancer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      freelancer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      freelancer.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRemote = !remoteOnly || freelancer.remoteOk;
    const matchesSpecialization = selectedSpecializations.length === 0 ||
      freelancer.specializations.some(spec => selectedSpecializations.includes(spec));
    const matchesSkills = selectedSkills.length === 0 ||
      freelancer.skills.some(skill => selectedSkills.includes(skill));
    return matchesSearch && matchesRemote && matchesSpecialization && matchesSkills;
  });

  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case "available":
        return <Badge className="bg-success text-success-foreground">Available</Badge>;
      case "limited":
        return <Badge className="bg-warning text-warning-foreground">Limited</Badge>;
      default:
        return <Badge variant="secondary">Unavailable</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background py-8">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">L&D Freelancer Directory</h1>
          <p className="text-muted-foreground text-lg">
            Connect with expert instructional designers, e-learning developers, and training consultants
          </p>
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
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <h2 className="font-semibold text-lg">Filters</h2>

              {/* Remote Only */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={remoteOnly}
                    onCheckedChange={() => setRemoteOnly(!remoteOnly)}
                  />
                  <span className="text-sm">Remote Available Only</span>
                </label>
              </div>

              {/* Specialization Filter */}
              <div>
                <h3 className="font-medium mb-3">Specialization</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedSpecializations.includes(category.name)}
                        onCheckedChange={() => toggleFilter(category.name, selectedSpecializations, setSelectedSpecializations)}
                      />
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Skills Filter */}
              <div>
                <h3 className="font-medium mb-3">Skills</h3>
                <div className="space-y-2">
                  {skills.map((skill) => (
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

              {/* Availability Filter */}
              <div>
                <h3 className="font-medium mb-3">Availability</h3>
                <div className="space-y-2">
                  {availabilityOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedAvailability.includes(option)}
                        onCheckedChange={() => toggleFilter(option, selectedAvailability, setSelectedAvailability)}
                      />
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Freelancer Cards */}
          <main className="flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              {filteredFreelancers.length} professionals found
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {filteredFreelancers.map((freelancer) => (
                <article
                  key={freelancer.id}
                  className={`bg-card rounded-xl border p-6 hover:shadow-card-hover transition-all duration-200 ${
                    freelancer.featured ? "border-primary/50" : "border-border hover:border-primary/30"
                  }`}
                >
                  {freelancer.featured && (
                    <div className="flex items-center gap-1 text-primary text-sm font-medium mb-3">
                      <Star className="h-4 w-4 fill-primary" />
                      Featured Professional
                    </div>
                  )}

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">{getInitials(freelancer.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">{freelancer.name}</h3>
                        {getAvailabilityBadge(freelancer.availability)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{freelancer.title}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {freelancer.location}
                    </span>
                    {freelancer.remoteOk && (
                      <span className="text-primary font-medium">Remote OK</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {freelancer.experience}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {freelancer.hourlyRate}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {freelancer.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>

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

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {freelancer.bio}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      {freelancer.linkedIn && (
                        <a href={freelancer.linkedIn} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {(freelancer.website || freelancer.portfolio) && (
                        <a href={freelancer.website || freelancer.portfolio} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      View Profile
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FreelancersPage;
