import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nuave - Audit Visibilitas AI",
  description:
    "Lihat bagaimana satu bisnis klien muncul dalam rangkaian rekomendasi ChatGPT yang ditentukan, lalu sampaikan temuan yang telah ditinjau dalam laporan yang jelas dan dapat diunduh.",
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
      className={`${GeistSans.variable} ${inter.variable} ${lora.variable}`}
    >
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <SmoothScroll />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
