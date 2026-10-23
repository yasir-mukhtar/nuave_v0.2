import type { Metadata } from "next";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { geistMono, geistSans } from "@/app/fonts";
import { MotionPreferences } from "@/components/motion/MotionPreferences";

export const metadata: Metadata = {
  title: "Nuave · Klinik Anda disebut AI?",
  description:
    "Calon pasien kini tanya AI sebelum memilih klinik. Nuave menunjukkan apakah klinik Anda disebut, klinik mana yang disebut, dan apa yang perlu dibenahi.",
  openGraph: {
    title: "Nuave · Klinik Anda disebut AI?",
    description:
      "Calon pasien kini tanya AI sebelum memilih klinik. Nuave menunjukkan apakah klinik Anda disebut, klinik mana yang disebut, dan apa yang perlu dibenahi.",
    siteName: "Nuave",
    locale: "id_ID",
    type: "website",
  },
  robots: { index: false, follow: false },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <MotionPreferences>{children}</MotionPreferences>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
