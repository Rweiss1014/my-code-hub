import { Link } from "react-router-dom";
import { Search, Briefcase, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stats, categories } from "@/data/mockData";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden gradient-hero py-20 lg:py-28">
      <div className="container relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in">
            The L&D Industry's Premier
            <br />
            Job Board & Talent Network
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Connect with top instructional designers, e-learning developers, and training professionals. Find your next opportunity or hire expert L&D talent.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Link to="/jobs">
              <Button variant="heroSolid" size="lg" className="gap-2 w-full sm:w-auto">
                <Briefcase className="h-5 w-5" />
                Browse Jobs
              </Button>
            </Link>
            <Link to="/freelancers">
              <Button variant="hero" size="lg" className="gap-2 w-full sm:w-auto">
                <Users className="h-5 w-5" />
                Find Talent
              </Button>
            </Link>
          </div>

          <div className="max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search jobs: Instructional Designer, E-Learning Developer..."
                className="pl-12 pr-28 h-14 text-base bg-background border-0 shadow-lg"
              />
              <Button className="absolute right-2 top-1/2 -translate-y-1/2">
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  return (
    <section className="py-12 border-b border-border">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CategoriesSection = () => {
  return (
    <section className="py-16 lg:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by L&D Specialty</h2>
          <p className="text-muted-foreground text-lg">
            Find opportunities across all areas of Learning & Development
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/jobs?category=${category.slug}`}
              className="group p-6 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-card-hover transition-all duration-200"
            >
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-sm text-muted-foreground">{category.jobCount} jobs</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* For Professionals */}
          <div className="bg-card rounded-2xl p-8 border border-border">
            <h3 className="text-2xl font-bold mb-6">For L&D Professionals</h3>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">Access curated jobs from top L&D job boards</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">Create a profile to showcase your expertise</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">Get discovered by employers seeking L&D talent</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">Set up job alerts for new opportunities</span>
              </li>
            </ul>
            <Link to="/signup?type=freelancer">
              <Button size="lg" className="w-full">Create your profile</Button>
            </Link>
          </div>

          {/* For Employers */}
          <div className="bg-card rounded-2xl p-8 border border-border">
            <h3 className="text-2xl font-bold mb-6">For Employers & Agencies</h3>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">Browse verified L&D freelancers and consultants</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">Post job listings to reach L&D professionals</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">Filter by skills, experience, and availability</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground">Connect directly with specialized L&D talent</span>
              </li>
            </ul>
            <Link to="/freelancers">
              <Button variant="outline" size="lg" className="w-full">Browse L&D talent</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const HomePage = () => {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <CategoriesSection />
      <CTASection />
    </>
  );
};

export default HomePage;
