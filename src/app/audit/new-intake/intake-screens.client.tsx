"use client";

import { useState } from "react";

/**
 * Client-side wiring for the non-production new-intake preview.
 *
 * Lives in its own client module because the App Router forbids passing
 * component functions (the screen-slot map) from a Server Component into
 * the client `IntakeJourney` shell. The server page keeps the preview gate
 * and fixture selection; this module only wires already-chosen serializable
 * props. Whole-journey screen map only — never per-screen flags.
 */
import IntakeJourney from "@/lib/intake/IntakeJourney";
import IntakeFixturePlaceholder from "@/lib/intake/IntakeFixturePlaceholder";
import ArrivalFlow from "@/lib/intake/arrival";
import type { IntakeFixture } from "@/lib/intake/fixtures";
import type {
  IntakeEntryMode,
  IntakeScopeChoice,
  IntakeScreenSlot,
  IntakeScreenSlotProps,
} from "@/lib/intake/navigation";
import { BAB1_SCREENS } from "@/lib/intake/screens-bab1";
import { BAB2_SCREENS } from "@/lib/intake/screens-bab2";

const ALL_SCREENS: Partial<Record<string, IntakeScreenSlot>> = {
  ...BAB1_SCREENS,
  ...BAB2_SCREENS,
};

function CombinedSlot(props: IntakeScreenSlotProps) {
  const Slot = ALL_SCREENS[props.screenId];
  if (Slot) return <Slot {...props} />;
  return <IntakeFixturePlaceholder screenId={props.screenId} />;
}

export default function IntakePreviewClient({
  entry,
  stubScope,
  stubBrandNeedsFix,
  stubMarketSkipped,
  fixture,
  withArrival,
}: {
  entry: IntakeEntryMode;
  stubScope: IntakeScopeChoice;
  stubBrandNeedsFix: boolean;
  stubMarketSkipped: boolean;
  fixture: IntakeFixture;
  withArrival: boolean;
}) {
  const [arrived, setArrived] = useState(!withArrival);
  if (withArrival && !arrived) {
    return <ArrivalFlow onArrived={() => setArrived(true)} />;
  }
  return (
    <IntakeJourney
      entry={entry}
      stubScope={stubScope}
      stubBrandNeedsFix={stubBrandNeedsFix}
      stubMarketSkipped={stubMarketSkipped}
      fixtureOverride={fixture}
      ScreenSlot={CombinedSlot}
    />
  );
}
