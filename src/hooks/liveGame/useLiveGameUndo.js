import { useState } from "react";

/**
 * useLiveGameUndo
 *
 * Owns the history stack and the pending-undo dialog flag.
 *
 * Usage:
 *   - Scoring calls onBeforeApply (provided by composer as undo.pushHistory)
 *     synchronously before mutating state, so the snapshot captured is the
 *     state *before* the point is applied.
 *   - confirmUndo() pops the latest snapshot and hands it to applySnapshot,
 *     which is provided by the composer (calls scoring.applySnapshot).
 *
 * @param {{ applySnapshot: (snap: object) => void }} opts
 */
export function useLiveGameUndo({ applySnapshot }) {
  const [history, setHistory] = useState([]);
  const [pendingUndo, setPendingUndo] = useState(false);

  /** Push the current scoring snapshot onto the history stack. */
  const pushHistory = (snapshot) => {
    setHistory(prev => [...prev, snapshot]);
  };

  /** Open the undo confirmation dialog (no-op if nothing to undo). */
  const requestUndo = () => {
    if (history.length > 0) setPendingUndo(true);
  };

  /** Apply the most-recent snapshot and pop it from history. */
  const confirmUndo = () => {
    if (history.length === 0) return;
    const snap = history[history.length - 1];
    applySnapshot(snap);
    setHistory(h => h.slice(0, -1));
    setPendingUndo(false);
  };

  const cancelUndo = () => setPendingUndo(false);

  /** Full reset called by the composer's reset(). */
  const resetUndo = () => {
    setHistory([]);
    setPendingUndo(false);
  };

  return {
    history,
    pendingUndo,
    pushHistory,
    requestUndo,
    confirmUndo,
    cancelUndo,
    resetUndo,
  };
}
