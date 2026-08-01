import Footer from "@/components/Footer";
import HowItWorks from "@/components/HowItWorks";
import LandingCtaSection from "@/components/LandingCtaSection";
import LandingFaqSection from "@/components/LandingFaqSection";
import LandingHeroSection from "@/components/LandingHeroSection";
import LandingNav from "@/components/LandingNav";
import LandingProblemSection from "@/components/LandingProblemSection";
import LandingStatsSection from "@/components/LandingStatsSection";

export default function Home() {
  return (
    <main className="lp-page min-h-screen bg-white">
      <div className="bg-[var(--lp-bg)]">
        <LandingNav />
        <LandingHeroSection />
      </div>
      <LandingProblemSection />
      <HowItWorks />
      <LandingStatsSection />
      <LandingFaqSection />
      <LandingCtaSection />
      <Footer />
    </main>
  );
}
