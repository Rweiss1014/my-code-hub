import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FreelancersPage from "@/components/freelancers/FreelancersPage";

const Freelancers = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <FreelancersPage />
      </main>
      <Footer />
    </div>
  );
};

export default Freelancers;
