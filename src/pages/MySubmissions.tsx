import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Briefcase, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface JobSubmission {
  id: string;
  title: string;
  company: string;
  status: string;
  admin_feedback: string | null;
  created_at: string;
}

interface FreelancerSubmission {
  id: string;
  full_name: string;
  title: string;
  status: string;
  admin_feedback: string | null;
  created_at: string;
}

const MySubmissions = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [jobSubmissions, setJobSubmissions] = useState<JobSubmission[]>([]);
  const [freelancerSubmissions, setFreelancerSubmissions] = useState<FreelancerSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchSubmissions();
    }
  }, [user, authLoading, navigate]);

  const fetchSubmissions = async () => {
    const [jobsRes, freelancersRes] = await Promise.all([
      supabase
        .from("job_submissions")
        .select("id, title, company, status, admin_feedback, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("freelancer_submissions")
        .select("id, full_name, title, status, admin_feedback, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false }),
    ]);

    if (jobsRes.data) setJobSubmissions(jobsRes.data);
    if (freelancersRes.data) setFreelancerSubmissions(freelancersRes.data);
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-success text-success-foreground gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">My Submissions</h1>

        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Job Postings ({jobSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="freelancer" className="gap-2">
              <Users className="h-4 w-4" />
              Freelancer Profiles ({freelancerSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-6">
            {jobSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You haven't submitted any job postings yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {jobSubmissions.map((job) => (
                  <Card key={job.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{job.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{job.company}</p>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Submitted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </p>
                      {job.admin_feedback && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Feedback:</p>
                          <p className="text-sm text-muted-foreground">{job.admin_feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="freelancer" className="mt-6">
            {freelancerSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You haven't submitted a freelancer profile yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {freelancerSubmissions.map((freelancer) => (
                  <Card key={freelancer.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{freelancer.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{freelancer.title}</p>
                        </div>
                        {getStatusBadge(freelancer.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Submitted {formatDistanceToNow(new Date(freelancer.created_at), { addSuffix: true })}
                      </p>
                      {freelancer.admin_feedback && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Feedback:</p>
                          <p className="text-sm text-muted-foreground">{freelancer.admin_feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default MySubmissions;
