"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

type ProblemCardProps = Readonly<{
  color: string;
  number: string;
  description: string;
  chips: string[];
  phase?: number;
}>;

function ProblemCard({
  color,
  number,
  description,
  chips,
  phase = 0,
}: ProblemCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowPosition = useRef({ x: 250, y: 240 });
  const targetPosition = useRef({ x: 250, y: 240 });
  const isHovering = useRef(false);
  const animationFrame = useRef<number>(0);
  const time = useRef(phase);
  const opacity = useRef(0.35);
  const targetOpacity = useRef(0.35);
  const glowElement = useRef<HTMLDivElement>(null);

  const getAmbientPosition = useCallback(
    (elapsed: number, width: number, height: number) => ({
      x: width / 2 + Math.sin(elapsed * 0.4) * width * 0.4,
      y: height / 2 + Math.cos(elapsed * 0.6) * height * 0.35,
    }),
    [],
  );

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowElement.current;
    if (!card || !glow) return;

    let previousTime = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - previousTime) / 1000;
      previousTime = now;
      const bounds = card.getBoundingClientRect();

      if (isHovering.current) {
        targetOpacity.current = 1;
      } else {
        time.current += elapsed;
        targetPosition.current = getAmbientPosition(
          time.current,
          bounds.width,
          bounds.height,
        );
        targetOpacity.current = 0.3 + Math.sin(time.current * 1.2) * 0.1;
      }

      const positionSpeed = isHovering.current ? 0.15 : 0.03;
      glowPosition.current.x +=
        (targetPosition.current.x - glowPosition.current.x) * positionSpeed;
      glowPosition.current.y +=
        (targetPosition.current.y - glowPosition.current.y) * positionSpeed;
      opacity.current +=
        (targetOpacity.current - opacity.current) *
        (isHovering.current ? 0.1 : 0.04);

      glow.style.opacity = String(opacity.current);
      glow.style.background = `radial-gradient(600px circle at ${glowPosition.current.x}px ${glowPosition.current.y}px, ${color}, transparent 60%)`;
      animationFrame.current = requestAnimationFrame(tick);
    };

    animationFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame.current);
  }, [color, getAmbientPosition]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const bounds = cardRef.current?.getBoundingClientRect();
      if (!bounds) return;
      targetPosition.current = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    },
    [],
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        isHovering.current = true;
      }}
      onMouseLeave={() => {
        isHovering.current = false;
      }}
      className="lp-problem-card relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white"
    >
      <div ref={glowElement} className="pointer-events-none absolute inset-0" />
      <div className="relative px-10 pt-10">
        <p className="m-0 mb-5 text-[48px] leading-[1.2em] font-medium tracking-[-2px] text-[#111827]">
          {number}
        </p>
        <p className="m-0 max-w-[340px] text-[22px] leading-[1.4em] font-medium tracking-[-0.5px] text-[#111827]">
          {description}
        </p>
      </div>
      <div className="relative flex flex-col gap-2.5 px-10 pt-[80px] pb-10">
        {chips.map((chip) => (
          <span
            key={chip}
            className="inline-block self-start rounded-full border border-black/[0.08] bg-white/85 px-4 py-2 text-[14px] font-normal text-[#111827] backdrop-blur-[4px]"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingProblemSection() {
  const t = useTranslations();
  const cards = [
    {
      color: "rgba(168, 130, 255, 0.45)",
      number: t("landing.problemCard1Number"),
      description: t("landing.problemCard1Desc"),
      chips: [
        t("landing.problemCard1Chip1"),
        t("landing.problemCard1Chip2"),
        t("landing.problemCard1Chip3"),
      ],
    },
    {
      color: "rgba(255, 175, 120, 0.45)",
      number: t("landing.problemCard2Number"),
      description: t("landing.problemCard2Desc"),
      chips: [
        t("landing.problemCard2Chip1"),
        t("landing.problemCard2Chip2"),
        t("landing.problemCard2Chip3"),
      ],
    },
  ];

  return (
    <section className="lp-problem-section bg-white px-8 py-[120px]">
      <div className="mx-auto max-w-[1044px]">
        <h2 className="lp-problem-heading m-0 mb-14 text-center">
          {t("landing.problemHeading")}
        </h2>
        <div className="lp-problem-grid grid grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <ProblemCard key={card.number} {...card} phase={index * 3.5} />
          ))}
        </div>
      </div>
    </section>
  );
}
