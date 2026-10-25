"use client";

import {
  IconAntennaBars5,
  IconBabyCarriage,
  IconBattery4,
  IconChevronLeft,
  IconDental,
  IconDroplet,
  IconEdit,
  IconFlower,
  IconSparkles,
  IconStethoscope,
  IconWifi,
  type Icon,
} from "@tabler/icons-react";
import { NuaveMark } from "@/components/product/journey/NuaveLogo";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from "./HeroDemo.module.css";

type ClinicExample = {
  value: string;
  label: string;
  Icon: Icon;
  question: string;
  clinics: [string, string, string];
};

/** Spec 019 COPY.md: Kecantikan is the founder's; the others were approved
 * with the spec (D-4). The clinics are fictional. */
const EXAMPLES: ClinicExample[] = [
  {
    value: "kecantikan",
    label: "Kecantikan",
    Icon: IconFlower,
    question:
      "Ada klinik kecantikan di Jakarta Selatan yang bisa atasi bekas jerawat dan buka Sabtu?",
    clinics: [
      "laser bekas jerawat oleh dokter",
      "buka Sabtu sampai sore",
      "harga jelas sejak konsultasi",
    ],
  },
  {
    value: "gigi",
    label: "Gigi",
    Icon: IconDental,
    question:
      "Ada klinik gigi di Jakarta Selatan yang bisa pasang behel dan buka sampai malam?",
    clinics: [
      "behel oleh dokter gigi spesialis",
      "buka sampai malam",
      "biaya behel bisa dicicil",
    ],
  },
  {
    value: "kulit",
    label: "Kulit",
    Icon: IconDroplet,
    question:
      "Ada klinik kulit di Jakarta Selatan yang bisa atasi jerawat parah dan konsultasi online?",
    clinics: [
      "ditangani dokter spesialis kulit",
      "bisa konsultasi online dulu",
      "jadwal dokter tertera di website",
    ],
  },
  {
    value: "anak",
    label: "Anak",
    Icon: IconBabyCarriage,
    question:
      "Ada klinik anak di Jakarta Selatan yang melayani vaksin dan buka hari Minggu?",
    clinics: [
      "jadwal vaksin anak lengkap",
      "buka hari Minggu pagi",
      "ruang tunggu ramah anak",
    ],
  },
  {
    value: "lainnya",
    label: "Lainnya",
    Icon: IconStethoscope,
    question:
      "Ada klinik umum di Jakarta Selatan yang bisa medical check-up dan buka 24 jam?",
    clinics: [
      "paket medical check-up lengkap",
      "buka 24 jam, ada dokter jaga",
      "harga paket tertera jelas",
    ],
  },
];

const THUMBS = [
  "/landing/clinic-a.webp",
  "/landing/clinic-b.webp",
  "/landing/clinic-c.webp",
];
const NAMES = ["Klinik A:", "Klinik B:", "Klinik C:"];

/** The report card's dots: which of the ten (and six) questions named the
 * clinic, as drawn in Figma. */
const CHATGPT_DOTS = [2, 6, 8];
const GOOGLE_DOTS = [1];

function Dots({ count, on }: { count: number; on: number[] }) {
  return (
    <span className={styles.dots} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          className={on.includes(index + 1) ? styles.dotOn : styles.dot}
        />
      ))}
    </span>
  );
}

/**
 * The hero's picture: a patient asks an AI app which clinic to choose, and
 * the clinic-type tabs change the question and the three named clinics.
 * The report card and "Klinik Anda?" stay. Decorative apart from the tabs.
 */
export function HeroDemo({ className }: { className?: string }) {
  return (
    <Tabs defaultValue="kecantikan" className={cn(styles.demo, className)}>
      <div className={styles.tabsScroller}>
        <TabsList
          className={styles.tabs}
          aria-label="Jenis klinik"
          activateOnFocus
        >
          {EXAMPLES.map(({ value, label, Icon }) => (
            <TabsTrigger key={value} value={value} className={styles.tab}>
              <Icon
                className={styles.tabIcon}
                stroke={1.75}
                aria-hidden="true"
              />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className={styles.stage}>
        <div className={styles.phone}>
          <span className={styles.key} data-key="1" aria-hidden="true" />
          <span className={styles.key} data-key="2" aria-hidden="true" />
          <span className={styles.key} data-key="3" aria-hidden="true" />
          <span className={styles.key} data-key="4" aria-hidden="true" />
          <div className={styles.screen}>
            <span className={styles.island} aria-hidden="true" />
            <div className={styles.status} aria-hidden="true">
              <span>9:41</span>
              <span className={styles.statusIcons}>
                <IconAntennaBars5 size={18} stroke={2} />
                <IconWifi size={16} stroke={2} />
                <IconBattery4 size={26} stroke={1.5} />
              </span>
            </div>
            <div className={styles.appbar} aria-hidden="true">
              <IconChevronLeft size={22} stroke={1.75} />
              <span className={styles.appbarMid}>
                <span className={styles.aiDot}>
                  <IconSparkles size={13} stroke={2} />
                </span>
                AI
              </span>
              <IconEdit size={21} stroke={1.75} />
            </div>
            {EXAMPLES.map((example) => (
              <TabsContent
                key={example.value}
                value={example.value}
                className={styles.thread}
              >
                <p className={styles.bubble}>{example.question}</p>
                <p className={styles.lead}>
                  Beberapa klinik yang bisa dipertimbangkan:
                </p>
                <ul className={styles.results}>
                  {example.clinics.map((why, index) => (
                    <li key={NAMES[index]} className={styles.result}>
                      <span className={styles.thumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- static art from /public, sized on purpose */}
                        <img
                          src={THUMBS[index]}
                          width={46}
                          height={46}
                          alt=""
                          decoding="async"
                          loading="eager"
                          draggable={false}
                        />
                      </span>
                      <span className={styles.resultText}>
                        <span className={styles.resultName}>
                          {NAMES[index]}
                        </span>
                        <span className={styles.resultWhy}>{why}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={styles.slot}>
                  <span className={styles.slotThumb} aria-hidden="true">
                    ?
                  </span>
                  <span className={styles.slotLabel}>Klinik Anda?</span>
                </p>
              </TabsContent>
            ))}
          </div>
        </div>

        <span className={styles.fade} aria-hidden="true" />

        <div className={styles.report}>
          <p className={styles.reportHead}>
            <NuaveMark className={styles.reportMark} />
            AI Visibility Report
          </p>
          <p className={styles.reportRow}>
            <span className={styles.reportName}>ChatGPT</span>
            <span className={styles.reportScore}>muncul di 3 dari 10</span>
          </p>
          <Dots count={10} on={CHATGPT_DOTS} />
          <hr className={styles.reportDivider} />
          <p className={styles.reportRow}>
            <span className={styles.reportName}>Google AI Overview</span>
            <span className={styles.reportScore}>muncul di 1 dari 6</span>
          </p>
          <Dots count={6} on={GOOGLE_DOTS} />
        </div>

        <p className={styles.caption}>Nama klinik hanya ilustrasi.</p>
      </div>
    </Tabs>
  );
}
