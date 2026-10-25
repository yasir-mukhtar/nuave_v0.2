import { Hero } from "./Hero";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { StickyBar } from "./StickyBar";
import { AnswerCompare } from "./sections/AnswerCompare";
import { Closing } from "./sections/Closing";
import { Faq } from "./sections/Faq";
import { HowItWorks } from "./sections/HowItWorks";
import { PriceReceipt } from "./sections/PriceReceipt";
import { Reasons } from "./sections/Reasons";
import { ReportShowcase } from "./sections/ReportShowcase";
import { TrustPoints } from "./sections/TrustPoints";
import styles from "./landing.module.css";

/**
 * The clinic landing page at `/` (Spec 019): the founder's Figma page
 * "Landing · Full page v2" with the words of the spec's COPY.md.
 */
export default function ClinicLanding() {
  return (
    <div className={styles.page} lang="id">
      <SiteHeader />
      <main>
        <Hero />
        <Reasons />
        <AnswerCompare />
        <HowItWorks />
        <ReportShowcase />
        <TrustPoints />
        <PriceReceipt />
        <Faq />
        <Closing />
      </main>
      <SiteFooter />
      <StickyBar />
    </div>
  );
}
