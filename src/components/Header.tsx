import { Link, useLocation } from "react-router-dom";
import { Briefcase, Users, PlusCircle, LogIn, UserPlus, LogOut, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "./NotificationBell";

const Header = () => {
  const location = useLocation();
  const { user, isLoading, isAdmin, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              L&D
            </div>
            <span className="text-lg font-semibold text-foreground">L&D Exchange</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link to="/jobs">
              <Button
                variant={isActive("/jobs") ? "secondary" : "ghost"}
                className="gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Find Jobs
              </Button>
            </Link>
            <Link to="/freelancers">
              <Button
                variant={isActive("/freelancers") ? "secondary" : "ghost"}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Find Talent
              </Button>
            </Link>
            <Link to="/post-job">
              <Button
                variant={isActive("/post-job") ? "secondary" : "ghost"}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Post a Job
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? null : user ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="icon" title="Admin Dashboard">
                    <Shield className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Link to="/my-submissions">
                <Button variant="ghost" size="icon" title="My Submissions">
                  <FileText className="h-5 w-5" />
                </Button>
              </Link>
              <NotificationBell />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <Button variant="ghost" className="gap-2" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Log In
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
