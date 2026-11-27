"use client";

import { useEffect } from "react";
import type { ExplorerState } from "./reducer";

const TYPING_MS = 900;
const DWELL_MS = 5500;

export function useExplorerTimers(
  state: ExplorerState,
  visible: boolean,
  reduced: boolean,
  dispatch: (action: { type: "reveal" } | { type: "advance" }) => void,
): void {
  useEffect(() => {
    const { current, phase, playing, done } = state;
    if (!visible || reduced || !playing || current < 0 || done) return;

    if (phase === "typing") {
      const id = setTimeout(() => dispatch({ type: "reveal" }), TYPING_MS);
      return () => clearTimeout(id);
    }

    const id = setTimeout(() => dispatch({ type: "advance" }), DWELL_MS);
    return () => clearTimeout(id);
  }, [state, visible, reduced, dispatch]);
}
