import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface JobSubmission {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string;
  location_type: string;
  employment_type: string;
  salary: string | null;
  category: string;
  description: string | null;
  apply_url: string | null;
  status: string;
  created_at: string;
}

interface FreelancerSubmission {
  id: string;
  user_id: string;
  full_name: string;
  title: string;
  bio: string | null;
  skills: string[];
  hourly_rate: string | null;
  portfolio_url: string | null;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobSubmissions, setJobSubmissions] = useState<JobSubmission[]>([]);
  const [freelancerSubmissions, setFreelancerSubmissions] = useState<FreelancerSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [feedbackDialog, setFeedbackDialog] = useState<{
    open: boolean;
    type: "job" | "freelancer";
    id: string;
    action: "approve" | "reject";
  } | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (!isAdmin) {
        navigate("/");
        return;
      }
      fetchSubmissions();
    }
  }, [user, authLoading, isAdmin, navigate]);

  const fetchSubmissions = async () => {
    const [jobsRes, freelancersRes] = await Promise.all([
      supabase
        .from("job_submissions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("freelancer_submissions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);

    if (jobsRes.data) setJobSubmissions(jobsRes.data);
    if (freelancersRes.data) setFreelancerSubmissions(freelancersRes.data);
    setIsLoading(false);
  };

  const handleAction = (
    type: "job" | "freelancer",
    id: string,
    action: "approve" | "reject"
  ) => {
    setFeedbackDialog({ open: true, type, id, action });
    setFeedback("");
  };

  const processAction = async () => {
    if (!feedbackDialog || !user) return;

    setIsProcessing(true);
    const { type, id, action } = feedbackDialog;

    if (type === "job") {
      const submission = jobSubmissions.find((j) => j.id === id);
      if (!submission) return;

      // Update submission status
      const { error: updateError } = await supabase
        .from("job_submissions")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_feedback: feedback || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        toast({ title: "Error", description: "Failed to process submission", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      // If approved, create actual job posting
      if (action === "approve") {
        const { error: insertError } = await supabase.from("jobs").insert({
          title: submission.title,
          company: submission.company,
          location: submission.location,
          location_type: submission.location_type,
          employment_type: submission.employment_type,
          salary: submission.salary,
          category: submission.category,
          description: submission.description,
          apply_url: submission.apply_url,
          source: "user_submission",
        });

        if (insertError) {
          toast({ title: "Warning", description: "Job submission approved but failed to create listing", variant: "destructive" });
        }
      }

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: submission.user_id,
        title: action === "approve" ? "Job Posting Approved!" : "Job Posting Rejected",
        message:
          action === "approve"
            ? `Your job posting "${submission.title}" has been approved and is now live.`
            : `Your job posting "${submission.title}" was not approved.${feedback ? ` Feedback: ${feedback}` : ""}`,
        type: action === "approve" ? "success" : "warning",
        link: action === "approve" ? "/jobs" : "/my-submissions",
      });

      setJobSubmissions((prev) => prev.filter((j) => j.id !== id));
    } else {
      const submission = freelancerSubmissions.find((f) => f.id === id);
      if (!submission) return;

      // Update submission status
      const { error: updateError } = await supabase
        .from("freelancer_submissions")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_feedback: feedback || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        toast({ title: "Error", description: "Failed to process submission", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      // If approved, create freelancer profile
      if (action === "approve") {
        const { error: insertError } = await supabase.from("freelancers").insert({
          user_id: submission.user_id,
          full_name: submission.full_name,
          title: submission.title,
          bio: submission.bio,
          skills: submission.skills,
          hourly_rate: submission.hourly_rate,
          portfolio_url: submission.portfolio_url,
          submission_id: submission.id,
        });

        if (insertError) {
          toast({ title: "Warning", description: "Freelancer approved but failed to create profile", variant: "destructive" });
        }
      }

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: submission.user_id,
        title: action === "approve" ? "Profile Approved!" : "Profile Not Approved",
        message:
          action === "approve"
            ? `Your freelancer profile has been approved and is now visible in the talent directory.`
            : `Your freelancer profile was not approved.${feedback ? ` Feedback: ${feedback}` : ""}`,
        type: action === "approve" ? "success" : "warning",
        link: action === "approve" ? "/freelancers" : "/my-submissions",
      });

      setFreelancerSubmissions((prev) => prev.filter((f) => f.id !== id));
    }

    toast({
      title: action === "approve" ? "Approved" : "Rejected",
      description: `Submission has been ${action === "approve" ? "approved" : "rejected"}.`,
    });

    setIsProcessing(false);
    setFeedbackDialog(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = jobSubmissions.length + freelancerSubmissions.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Review and approve submissions</p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {pendingCount} pending
            </Badge>
          )}
        </div>

        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Job Postings ({jobSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="freelancers" className="gap-2">
              <Users className="h-4 w-4" />
              Freelancer Profiles ({freelancerSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-6">
            {jobSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No pending job submissions.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {jobSubmissions.map((job) => (
                  <Card key={job.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{job.title}</CardTitle>
                          <p className="text-muted-foreground">{job.company}</p>
                        </div>
                        <Badge variant="secondary">
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-medium">{job.location}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="font-medium">{job.location_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Employment</p>
                          <p className="font-medium">{job.employment_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Salary</p>
                          <p className="font-medium">{job.salary || "Not specified"}</p>
                        </div>
                      </div>

                      {job.description && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-1">Description</p>
                          <p className="text-sm whitespace-pre-wrap">{job.description}</p>
                        </div>
                      )}

                      {job.apply_url && (
                        <a
                          href={job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-4"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Application URL
                        </a>
                      )}

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleAction("job", job.id, "approve")}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleAction("job", job.id, "reject")}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="freelancers" className="mt-6">
            {freelancerSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No pending freelancer submissions.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {freelancerSubmissions.map((freelancer) => (
                  <Card key={freelancer.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{freelancer.full_name}</CardTitle>
                          <p className="text-muted-foreground">{freelancer.title}</p>
                        </div>
                        <Badge variant="secondary">
                          {formatDistanceToNow(new Date(freelancer.created_at), { addSuffix: true })}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {freelancer.bio && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-1">Bio</p>
                          <p className="text-sm">{freelancer.bio}</p>
                        </div>
                      )}

                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {freelancer.skills.map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Hourly Rate</p>
                          <p className="font-medium">{freelancer.hourly_rate || "Not specified"}</p>
                        </div>
                        {freelancer.portfolio_url && (
                          <div>
                            <p className="text-sm text-muted-foreground">Portfolio</p>
                            <a
                              href={freelancer.portfolio_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleAction("freelancer", freelancer.id, "approve")}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleAction("freelancer", freelancer.id, "reject")}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

      <Dialog open={feedbackDialog?.open} onOpenChange={() => setFeedbackDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {feedbackDialog?.action === "approve" ? "Approve Submission" : "Reject Submission"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">
              Feedback {feedbackDialog?.action === "reject" ? "(Recommended)" : "(Optional)"}
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={
                feedbackDialog?.action === "reject"
                  ? "Explain why this submission was rejected..."
                  : "Add any notes for the submitter..."
              }
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={processAction}
              disabled={isProcessing}
              variant={feedbackDialog?.action === "reject" ? "destructive" : "default"}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : feedbackDialog?.action === "approve" ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {feedbackDialog?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
