import type { Metadata } from "next";
import ClinicLanding from "@/components/landing/ClinicLanding";

export const metadata: Metadata = {
  title: "Nuave · Cek klinik Anda di ChatGPT dan Google AI Overview",
  description:
    "Cek apakah klinik Anda muncul di ChatGPT dan Google AI Overview, lalu lihat apa yang perlu dibenahi.",
};

export default function Home() {
  return <ClinicLanding />;
}
