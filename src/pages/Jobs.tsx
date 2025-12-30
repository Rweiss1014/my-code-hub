import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JobsPage from "@/components/jobs/JobsPage";

const Jobs = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <JobsPage />
      </main>
      <Footer />
    </div>
  );
};

export default Jobs;
