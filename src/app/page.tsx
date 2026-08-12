import Footer from "@/components/Footer";
import HowItWorks from "@/components/HowItWorks";
import LandingCtaSection from "@/components/LandingCtaSection";
import LandingFaqSection from "@/components/LandingFaqSection";
import LandingHeroSection from "@/components/LandingHeroSection";
import LandingNav from "@/components/LandingNav";
import LandingProblemSection from "@/components/LandingProblemSection";
import LandingStatsSection from "@/components/LandingStatsSection";
import { isFixturePreviewEnabled } from "@/lib/fixture-journey/config";

export const dynamic = "force-dynamic";

export default function Home() {
  const fixturePreviewEnabled = isFixturePreviewEnabled();
  return (
    <main className="lp-page min-h-screen bg-white">
      <div className="bg-[var(--lp-bg)]">
        <LandingNav fixturePreviewEnabled={fixturePreviewEnabled} />
        <LandingHeroSection fixturePreviewEnabled={fixturePreviewEnabled} />
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
