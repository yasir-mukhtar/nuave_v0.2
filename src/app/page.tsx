"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { IconChevronDown } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import HowItWorks from "@/components/HowItWorks";
import LandingNav from "@/components/LandingNav";

/* ───── Data ───── */

/* ───── Hero Asset URLs (Framer CDN) ───── */
const LOGO_SVG = "https://framerusercontent.com/images/r9wYEZlQeEIZBKytCeKUn5f1QGw.svg";
const DASHBOARD_IMAGES = [
  "https://framerusercontent.com/images/6KCcqoV5JsbhhakFNgDWYxdVzBA.png",
  "https://framerusercontent.com/images/YENU9KLYq8IxQPhP0g23k7epVQ.png",
  "https://framerusercontent.com/images/5z04w9x5IIQC2aQp3SPkEKtyT4.png",
];
/* HERO_STEPS moved inside HeroSection for i18n access */

const AI_LOGOS = [
  { src: "https://framerusercontent.com/images/1Qy4nO9eawrvXqYd9ILHfHG5VA.svg", alt: "Claude", w: 98, h: 24 },
  { src: "https://framerusercontent.com/images/PdwCanOeNG0AbS4iruy4sPRfdas.svg", alt: "Gemini", w: 110, h: 24 },
  { src: "https://framerusercontent.com/images/qQyt0pI4hotJKK8RE7TMneKyptI.svg", alt: "Perplexity", w: 94, h: 24 },
  { src: "https://framerusercontent.com/images/5UMspUrrkMvfl7lWs0vuweD8Tyk.svg", alt: "Meta AI", w: 89, h: 24 },
  { src: "https://framerusercontent.com/images/2WjKGtr45KhKPD7xLIEf4X0qRM.svg", alt: "ChatGPT", w: 110, h: 24 },
];

/* Nav component extracted to src/components/LandingNav.tsx */

/* ───── Hero Section (Framer design) ───── */
function HeroSection() {
  const t = useTranslations();
  const HERO_STEPS = [t('landing.heroStep1'), t('landing.heroStep2'), t('landing.heroStep3')];
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % HERO_STEPS.length);
    }, 3000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const handleStepClick = (i: number) => {
    setActiveStep(i);
    startTimer();
  };

  return (
    <section className="lp-root lp-hero-section relative w-full pt-[120px] px-[30px] flex justify-center overflow-hidden">
      <div className="max-w-[1200px] w-full flex flex-col items-center">
        {/* Text content */}
        <div className="flex flex-col items-center gap-6">
          {/* Headline */}
          <h1 className="lp-hero-heading max-w-[800px] text-center m-0">
            {t('landing.heroHeading')}
          </h1>

          {/* Subtitle */}
          <p className="lp-hero-subtitle max-w-[740px] text-[18px] font-normal leading-[1.7em] tracking-[-0.5px] text-[var(--lp-text-secondary)] text-center m-0">
            {t('landing.heroSubtitle')}
          </p>

          {/* CTA Button */}
          <Link
            href="/auth"
            className="btn-lp-purple inline-flex items-center px-[22px] py-3 text-white text-[14px] font-medium leading-[1.7em] rounded-[6px] border border-[var(--lp-border)] no-underline cursor-pointer"
          >
            {t('cta.auditBrandFree')}
          </Link>
        </div>

        {/* Preview area */}
        <div className="lp-hero-preview mt-16 w-full relative">
          {/* Purple gradient background */}
          <div className="relative w-full aspect-[1.82094] rounded-[12px] border border-[var(--lp-border)] overflow-hidden">
            {/* Animated gradient background */}
            <div className="lp-hero-bg-base" aria-hidden="true" />
            <div className="lp-hero-overlay-1" aria-hidden="true" />
            <div className="lp-hero-overlay-2" aria-hidden="true" />
            <div className="lp-hero-overlay-3" aria-hidden="true" />

            {/* Overlay content */}
            <div className="absolute inset-0 z-10 flex flex-col items-center pt-10 px-10 gap-6">
              {/* Stepper bar */}
              <div className="flex items-center gap-0 px-3.5 py-2 bg-white rounded-[10px] border border-[var(--lp-border)] shadow-[rgba(0,0,0,0.04)_0px_1px_4px_0px] h-[43px]">
                {HERO_STEPS.map((step, i) => (
                  <button
                    key={step}
                    onClick={() => handleStepClick(i)}
                    className="flex items-center gap-3.5 pr-3.5 bg-transparent border-none cursor-pointer text-[16px] font-medium leading-[1.7em] whitespace-nowrap"
                    style={{ color: activeStep === i ? "var(--lp-text-primary)" : "var(--lp-text-secondary)" }}
                  >
                    {/* Fixed 20px indicator box */}
                    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                      {activeStep === i ? (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="10" fill="#0a0a0a" />
                          <text
                            x="10" y="10"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#fff"
                            fontFamily="Inter, sans-serif"
                            fontWeight="600"
                            fontSize="14"
                            letterSpacing="0em"
                          >
                            {i + 1}
                          </text>
                        </svg>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[var(--lp-border)]" />
                      )}
                    </div>
                    {step}
                  </button>
                ))}
              </div>

              {/* Dashboard mockup card */}
              <div className="w-full max-w-[900px] h-[504px] p-4 backdrop-blur-[54px] bg-white/[0.54] rounded-[12px] shadow-[rgba(0,0,0,0.08)_0px_8px_32px_0px] overflow-hidden relative">
                {DASHBOARD_IMAGES.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt="Dashboard"
                    className="object-cover object-top rounded-[6px]"
                    style={{
                      position: i === 0 ? "relative" : "absolute",
                      top: i === 0 ? 0 : 16,
                      left: i === 0 ? 0 : 16,
                      width: i === 0 ? "100%" : "calc(100% - 32px)",
                      height: i === 0 ? "100%" : "calc(100% - 32px)",
                      opacity: activeStep === i ? 1 : 0,
                      transition: "opacity 0.5s ease",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───── FAQ Section ───── */

function FAQSection() {
  const t = useTranslations();
  const FAQS = Array.from({ length: 10 }, (_, i) => ({
    q: t(`faqs.q${i + 1}`),
    a: t(`faqs.a${i + 1}`),
  }));
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <section id="faq" className="lp-faq-section bg-[#F9FAFB] px-8 pt-[72px] pb-20">
      <div className="max-w-[740px] mx-auto">
        <h2 className="lp-faq-heading text-center mb-12">
          {t('landing.faqHeading')}
        </h2>
        <div className="flex flex-col gap-4">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex items-center justify-between gap-4 w-full p-6 bg-transparent border-none cursor-pointer text-left"
              >
                <span className="text-[18px] font-semibold tracking-[-0.5px] leading-[1.7em] text-[#111827]">
                  {faq.q}
                </span>
                <IconChevronDown
                  size={20}
                  stroke={1.5}
                  className="shrink-0 text-[#6B7280] transition-transform duration-300"
                  style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="text-[16px] font-normal leading-[1.6em] text-[#6B7280] m-0 px-6 pb-6">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Problem Cards ───── */

/* PROBLEM_CARDS moved inside Home for i18n access */

/* ───── Problem Card with cursor-following glow ───── */

function ProblemCard({ color, number, desc, chips, phase = 0 }: { color: string; number: string; desc: string; chips: string[]; phase?: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowPos = useRef({ x: 250, y: 240 });
  const targetPos = useRef({ x: 250, y: 240 });
  const isHovering = useRef(false);
  const rafId = useRef<number>(0);
  const timeRef = useRef(phase);
  const opacityRef = useRef(0.35);
  const targetOpacity = useRef(0.35);
  const glowEl = useRef<HTMLDivElement>(null);

  const getAmbientPos = useCallback((t: number, w: number, h: number) => {
    // Figure-8 / lissajous path that hugs corners and edges
    const cx = w / 2;
    const cy = h / 2;
    const rx = w * 0.4;
    const ry = h * 0.35;
    return {
      x: cx + Math.sin(t * 0.4) * rx,
      y: cy + Math.cos(t * 0.6) * ry,
    };
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowEl.current;
    if (!card || !glow) return;

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const rect = card.getBoundingClientRect();

      if (!isHovering.current) {
        // Ambient mode: advance time, compute drift target
        timeRef.current += dt;
        const ambient = getAmbientPos(timeRef.current, rect.width, rect.height);
        targetPos.current = ambient;
        targetOpacity.current = 0.3 + Math.sin(timeRef.current * 1.2) * 0.1; // breathe 0.2–0.4
      } else {
        targetOpacity.current = 1;
      }

      // Lerp position — faster when hovering, slower for ambient/leaving
      const lerpSpeed = isHovering.current ? 0.15 : 0.03;
      glowPos.current.x += (targetPos.current.x - glowPos.current.x) * lerpSpeed;
      glowPos.current.y += (targetPos.current.y - glowPos.current.y) * lerpSpeed;

      // Lerp opacity
      const opacitySpeed = isHovering.current ? 0.1 : 0.04;
      opacityRef.current += (targetOpacity.current - opacityRef.current) * opacitySpeed;

      // Direct DOM update — no React re-renders
      glow.style.opacity = String(opacityRef.current);
      glow.style.background = `radial-gradient(600px circle at ${glowPos.current.x}px ${glowPos.current.y}px, ${color}, transparent 60%)`;

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [color, getAmbientPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    targetPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseEnter = useCallback(() => {
    isHovering.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    // Glow stays at last cursor position, ambient drift will gradually take over via lerp
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="lp-problem-card relative rounded-[12px] border border-[#E5E7EB] overflow-hidden flex flex-col justify-between min-h-[440px] bg-white"
    >
      <div
        ref={glowEl}
        className="pointer-events-none absolute inset-0"
      />
      <div className="relative pt-10 px-10">
        <p className="text-[48px] font-medium tracking-[-2px] leading-[1.2em] text-[#111827] m-0 mb-5">{number}</p>
        <p className="text-[22px] font-medium tracking-[-0.5px] leading-[1.4em] text-[#111827] m-0 max-w-[340px]">{desc}</p>
      </div>
      <div className="relative pt-[80px] px-10 pb-10 flex flex-col gap-2.5">
        {chips.map((chip) => (
          <span key={chip} className="inline-block self-start text-[14px] font-normal text-[#111827] bg-white/85 border border-black/[0.08] rounded-full px-4 py-2 backdrop-blur-[4px]">
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───── Page ───── */

export default function Home() {
  const t = useTranslations();

  return (
    <div className="lp-page min-h-screen bg-white">

      {/* ──── Nav + Hero + AI Logos (Framer design) ──── */}
      <div style={{ background: "var(--lp-bg, #f7f7f5)" }}>
      <LandingNav />
      <HeroSection />

      {/* ──── AI Logos Marquee ──── */}
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <section className="lp-marquee-section w-full pt-[120px] pb-24 flex flex-col items-center gap-8 overflow-hidden">
        <p className="lp-marquee-text text-[18px] font-normal leading-[1.5em] text-[#0A0A0A] text-center m-0 px-[30px]">
          {t('landing.marqueeText')}
        </p>
        <div
          className="w-full max-w-[1045px] mx-auto overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-24 w-max"
            style={{ animation: "marquee-scroll 60s linear infinite" }}
          >
            {[...AI_LOGOS, ...AI_LOGOS, ...AI_LOGOS, ...AI_LOGOS].map((logo, i) => (
              <img key={`${logo.alt}-${i}`} src={logo.src} alt={logo.alt} className="block shrink-0 h-7 w-auto" />
            ))}
          </div>
        </div>
      </section>
      </div>{/* end Framer hero+marquee wrapper */}

      {/* ──── Problem Section ──── */}
      <section className="lp-problem-section bg-white px-8 py-[120px]">
        <div className="max-w-[1044px] mx-auto">
          <h2 className="lp-problem-heading text-center m-0 mb-14">
            {t('landing.problemHeading')}
          </h2>
          <div className="lp-problem-grid grid grid-cols-2 gap-6">
            {[
              {
                color: "rgba(168, 130, 255, 0.45)",
                number: t('landing.problemCard1Number'),
                desc: t('landing.problemCard1Desc'),
                chips: [t('landing.problemCard1Chip1'), t('landing.problemCard1Chip2'), t('landing.problemCard1Chip3')],
              },
              {
                color: "rgba(255, 175, 120, 0.45)",
                number: t('landing.problemCard2Number'),
                desc: t('landing.problemCard2Desc'),
                chips: [t('landing.problemCard2Chip1'), t('landing.problemCard2Chip2'), t('landing.problemCard2Chip3')],
              },
            ].map((card, i) => (
              <ProblemCard key={card.number} color={card.color} number={card.number} desc={card.desc} chips={card.chips} phase={i * 3.5} />
            ))}
          </div>
        </div>
      </section>

      {/* ──── How it works ──── */}
      <HowItWorks />

      {/* ──── Stats ──── */}
      <section className="lp-stats-section bg-[#F9FAFB] pt-[120px] pb-[120px]">
        <div className="px-8 text-center mb-6">
          <h2 className="lp-stats-heading m-0 mb-5" dangerouslySetInnerHTML={{ __html: t.raw('landing.statsHeading').replace(/\n/g, '<br class="lp-stats-br" />') }} />
          <p className="lp-stats-subtitle text-[20px] font-normal tracking-[-0.5px] leading-[1.7em] text-[#6B7280] m-0" dangerouslySetInnerHTML={{ __html: t('landing.statsSubtitle').replace(/\n/g, '<br class="lp-stats-br" />') }} />
        </div>
        <div className="h-px bg-[#E5E7EB]" />
        <div className="lp-stats-grid-inner grid grid-cols-3 max-w-[1044px] mx-auto">
          {[
            { number: t('landing.stat1Number'), title: t('landing.stat1Title'), body: t('landing.stat1Body') },
            { number: t('landing.stat2Number'), title: t('landing.stat2Title'), body: t('landing.stat2Body') },
            { number: t('landing.stat3Number'), title: t('landing.stat3Title'), body: t('landing.stat3Body') },
          ].map((stat, i) => (
            <div key={stat.title} className={cn("lp-stat-item px-10 py-12 border-r border-[#E5E7EB]", i === 0 && "border-l border-[#E5E7EB]")}>
              <p className="text-[40px] font-semibold tracking-[-1px] leading-[1.4em] text-[#111827] m-0 mb-2">{stat.number}</p>
              <p className="text-[24px] font-medium tracking-[-0.5px] leading-[1.4em] text-[#111827] m-0 mb-3">{stat.title}</p>
              <p className="text-[16px] font-normal leading-[1.7em] text-[#6B7280] m-0">{stat.body}</p>
            </div>
          ))}
        </div>
        <div className="h-px bg-[#E5E7EB]" />
        <p className="text-center mt-6 text-[13px] text-[#9CA3AF]">
          {t('common.source')}{" "}
          <a href="https://mybrandi.ai/referrals-from-ai-vs-google/" target="_blank" rel="noopener noreferrer" className="text-[#9CA3AF] underline">MyBrandi.ai</a>
          ,{" "}
          <a href="https://superprompt.com/blog/ai-search-traffic-conversion-rates-5x-higher-than-google-2025-data" target="_blank" rel="noopener noreferrer" className="text-[#9CA3AF] underline">Superprompt</a>
        </p>
      </section>


      {/* ──── FAQ ──── */}
      <FAQSection />

      {/* ──── Final CTA ──── */}
      <section
        className="lp-cta-section w-full min-h-[516px] px-8 py-[144px] flex items-center justify-center relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/bg-cta.png')" }}
      >
        <div className="flex flex-col items-center gap-10 text-center">
          <h2 className="lp-cta-heading m-0 max-w-[720px]">
            {t('landing.ctaHeading')}
          </h2>
          <Link
            href="/auth"
            className="btn-lp-black inline-flex items-center px-7 py-3.5 text-white text-[14px] font-medium rounded-[8px] no-underline cursor-pointer"
          >
            {t('cta.auditBrandFreeNoExclaim')}
          </Link>
        </div>
      </section>

      {/* ──── Footer ──── */}
      <Footer />
    </div>
  );
}
