import { useState } from "react";
import { ReportEn } from "./AppEn";
import { ReportId } from "./AppId";

/* ── Language switcher wrapper ── */

export default function App() {
  const [lang, setLang] = useState<"en" | "id">("en");

  const buttonBase =
    "px-3 py-1.5 rounded-full text-[0.78rem] font-semibold transition-colors cursor-pointer border-none";

  return (
    <>
      {/* Language toggle — inline styles so positioning never depends on Tailwind generation */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 9999,
          padding: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <button
          onClick={() => setLang("en")}
          className={buttonBase}
          style={{
            background: lang === "en" ? "#2563eb" : "transparent",
            color: lang === "en" ? "#ffffff" : "#6b7280",
          }}
        >
          EN
        </button>
        <button
          onClick={() => setLang("id")}
          className={buttonBase}
          style={{
            background: lang === "id" ? "#2563eb" : "transparent",
            color: lang === "id" ? "#ffffff" : "#6b7280",
          }}
        >
          ID
        </button>
      </div>

      {lang === "en" ? <ReportEn /> : <ReportId />}
    </>
  );
}
