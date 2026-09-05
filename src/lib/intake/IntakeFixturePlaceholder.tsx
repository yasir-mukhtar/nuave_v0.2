import {
  INTAKE_SCREEN_ORDER,
  intakeScreenPosition,
  type IntakeScreenId,
} from "./screens";

type IntakeFixturePlaceholderProps = {
  screenId: IntakeScreenId;
};

/**
 * Purpose-built fixture placeholder for unfinished new-journey screens.
 *
 * Rendered INSIDE the new `IntakeJourney` shell only. It never renders the
 * old form: this component has no knowledge of any legacy renderer and is
 * replaced screen by screen with real interactions in later phases (plan §5).
 */
export default function IntakeFixturePlaceholder({
  screenId,
}: IntakeFixturePlaceholderProps) {
  const position = intakeScreenPosition(screenId);
  const total = INTAKE_SCREEN_ORDER.length;
  return (
    <section
      data-new-intake-placeholder={screenId}
      aria-label={`Layar kerangka ${screenId}`}
      style={{ display: "grid", gap: "12px" }}
    >
      <p style={{ margin: 0, fontSize: "13px", opacity: 0.7 }}>
        Kerangka baru &mdash; Layar {position} dari {total}
      </p>
      <h1 style={{ margin: 0, fontSize: "24px", lineHeight: 1.25 }}>
        {screenId}
      </h1>
      <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.6 }}>
        Layar ini belum dibangun. Interaksi aslinya hadir di fase berikutnya;
        kerangka ini hanya menandai urutan dan posisinya di perjalanan baru.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" disabled style={{ padding: "10px 16px" }}>
          Kembali
        </button>
        <button type="button" disabled style={{ padding: "10px 16px" }}>
          Lanjut
        </button>
      </div>
    </section>
  );
}
