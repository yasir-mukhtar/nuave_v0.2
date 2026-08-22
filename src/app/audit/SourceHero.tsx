"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Spinner } from "@heroui/react";
import { IconArrowRight } from "@tabler/icons-react";
import { normalizeWebsiteInput } from "@/lib/audit/website-input";
import styles from "./audit.module.css";

export default function SourceHero({
  initialValue,
  extracting,
  error,
  onExtract,
  exiting,
}: {
  initialValue: string;
  extracting: boolean;
  error: string;
  onExtract: (normalizedUrl: string) => void;
  exiting: boolean;
}) {
  const [draft, setDraft] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const [focusGlow, setFocusGlow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const glowPos = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: 0, y: 0 });
  const isHovering = useRef(false);
  const rafId = useRef(0);
  const timeRef = useRef(0);
  const opacityRef = useRef(0.35);
  const targetOpacity = useRef(0.35);

  const getAmbientPos = useCallback((t: number, w: number, h: number) => {
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
    const glow = glowRef.current;
    const container = containerRef.current;
    if (!glow || !container) return;

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const rect = container.getBoundingClientRect();

      if (!isHovering.current) {
        timeRef.current += dt;
        const ambient = getAmbientPos(timeRef.current, rect.width, rect.height);
        targetPos.current = ambient;
        targetOpacity.current = 0.3 + Math.sin(timeRef.current * 1.2) * 0.1;
      } else {
        targetOpacity.current = 0.5;
      }

      const lerpSpeed = isHovering.current ? 0.12 : 0.025;
      glowPos.current.x +=
        (targetPos.current.x - glowPos.current.x) * lerpSpeed;
      glowPos.current.y +=
        (targetPos.current.y - glowPos.current.y) * lerpSpeed;

      const opacitySpeed = isHovering.current ? 0.08 : 0.03;
      opacityRef.current +=
        (targetOpacity.current - opacityRef.current) * opacitySpeed;

      glow.style.opacity = String(opacityRef.current);
      glow.style.background = `radial-gradient(600px circle at ${glowPos.current.x}px ${glowPos.current.y}px, rgba(83, 58, 253, 0.12), transparent 60%)`;

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [getAmbientPos]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    targetPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    isHovering.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
  }, []);

  const handleFocus = useCallback(() => {
    setFocusGlow(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusGlow(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeWebsiteInput(draft);
    if (!normalized.ok) {
      setValidationError(normalized.error);
      return;
    }
    setValidationError("");
    setDraft(normalized.url);
    onExtract(normalized.url);
  }

  const effectiveError = validationError || error;

  return (
    <div
      ref={containerRef}
      className={`${styles.heroStage} ${exiting ? styles.heroExiting : ""}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={glowRef} className={styles.heroGlow} />

      <div className={styles.heroContent}>
        <img
          src="/logo-nuave-horizontal.png"
          className={styles.heroLogo}
          alt="Nuave"
          width={152}
          height={32}
        />

        <h1 className={styles.heroHeading}>Ayo mulai audit brand Anda</h1>

        <form onSubmit={handleSubmit} className={styles.heroForm}>
          <div
            className={`${styles.heroInputBar} ${focusGlow ? styles.heroInputBarGlow : ""} ${extracting ? styles.heroInputLoading : ""}`}
            onClick={() => inputRef.current?.focus()}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="url"
              className={styles.heroInput}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setValidationError("");
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder=" "
              aria-label="Situs web resmi"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={extracting}
            />

            {!draft && !extracting && (
              <span className={styles.heroPlaceholderGroup} aria-hidden="true">
                <span className={styles.heroPlaceholder}>example.com</span>
                <span className={styles.heroPlaceholder}>
                  www.yourbrand.co.id
                </span>
                <span className={styles.heroPlaceholder}>
                  https://yourbrand.co.id
                </span>
              </span>
            )}

            {draft && !extracting && (
              <span className={styles.heroArrow}>
                <IconArrowRight size={20} stroke={2} />
              </span>
            )}

            {extracting && (
              <span className={styles.heroLoadingContent}>
                <Spinner size="sm" className={styles.heroSpinner} />
                Mengambil detail brand…
              </span>
            )}
          </div>

          <p
            className={`${styles.heroHint} ${draft || extracting ? styles.heroHintHidden : ""}`}
          >
            Tekan Enter untuk melanjutkan
          </p>

          {effectiveError && (
            <p className={`${styles.heroHint} ${styles.heroHintError}`}>
              {effectiveError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
