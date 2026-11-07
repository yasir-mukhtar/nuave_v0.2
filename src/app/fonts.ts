import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

/** The single font-loading owner for the Nuave application. */
export const geistSans = GeistSans;
export const geistMono = GeistMono;

/*
 * Spec 024 F-01: the fonts of the designed report PDF, used only inside its
 * pages (`/r/print` with the designed print on). Each file is static, one
 * weight per file, so Chromium embeds it as TrueType; the variable files
 * the app uses elsewhere embed as Type 3 (Step 0, finding 4). The files and
 * their licences are in src/assets/fonts/report/. Not preloaded: only the
 * print page uses them, and it waits for them itself (F-08). No fallback
 * face is generated, so a font that fails cannot be replaced silently.
 */
const reportFontOptions = {
  display: "block",
  preload: false,
  adjustFontFallback: false,
} as const;

/** Newsreader: headlines and big numbers (SIL OFL 1.1). */
export const reportSerif = localFont({
  ...reportFontOptions,
  src: [
    {
      path: "../assets/fonts/report/newsreader-latin-300-normal.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../assets/fonts/report/newsreader-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-report-serif",
});

/** Geist, static weights: the PDF's text (SIL OFL 1.1). */
export const reportSans = localFont({
  ...reportFontOptions,
  src: [
    {
      path: "../assets/fonts/report/Geist-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/report/Geist-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/report/Geist-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-report-sans",
});

/** Roboto Condensed: labels and page numbers, inside the PDF pages only
 * (SIL OFL 1.1). */
export const reportLabel = localFont({
  ...reportFontOptions,
  src: [
    {
      path: "../assets/fonts/report/roboto-condensed-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/report/roboto-condensed-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-report-label",
});

/** Geist Mono, static: only text that shows code (SIL OFL 1.1). */
export const reportCode = localFont({
  ...reportFontOptions,
  src: [
    {
      path: "../assets/fonts/report/GeistMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-report-code",
});

export const REPORT_FONTS = [
  reportSerif,
  reportSans,
  reportLabel,
  reportCode,
] as const;
