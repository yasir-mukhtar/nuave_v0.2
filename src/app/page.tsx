import LandingPage from "@/components/LandingPage";
import { isFixturePreviewEnabled } from "@/lib/fixture-journey/config";

export const dynamic = "force-dynamic";

export default function Home() {
  const fixturePreviewEnabled = isFixturePreviewEnabled();
  return <LandingPage fixturePreviewEnabled={fixturePreviewEnabled} />;
}
