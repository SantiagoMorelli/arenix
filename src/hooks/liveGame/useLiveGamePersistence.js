import { useState, useEffect } from "react";

/**
 * useLiveGamePersistence
 *
 * Owns the restore-prompt flag and all localStorage I/O:
 *   - Detects a saved game on mount and sets showRestore.
 *   - Auto-saves the combined game snapshot whenever the game is running and
 *     any tracked value changes (same dependency list as original).
 *   - restoreGame() loads the saved snapshot and calls restore(parsed) so the
 *     composer can fan the data out to setup + scoring.
 *   - discardSaved() removes the entry and hides the prompt.
 *
 * Behavior is identical to the original hook; dep-list corrections are deferred.
 *
 * @param {{
 *   saveKey: string,
 *   gameStarted: boolean,
 *   buildSnapshot: () => object,
 *   restore: (snap: object) => void,
 *   deps: any[],
 * }} opts
 */
export function useLiveGamePersistence({ saveKey, gameStarted, buildSnapshot, restore, deps }) {
  const [showRestore, setShowRestore] = useState(() => {
    try { return !!JSON.parse(localStorage.getItem(saveKey)); } catch { return false; }
  });

  // ── Auto-save ──────────────────────────────────────────────────────────────
  // We receive the exact same dep values as before (passed from composer via
  // the `deps` array) so behaviour is unchanged.
  useEffect(() => {
    if (!gameStarted) return;
    // eslint-disable-next-line no-empty
    try { localStorage.setItem(saveKey, JSON.stringify(buildSnapshot())); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, ...deps]);

  // ── Restore ────────────────────────────────────────────────────────────────
  const restoreGame = () => {
    try {
      const s = JSON.parse(localStorage.getItem(saveKey));
      if (!s) return;
      restore(s);
    // eslint-disable-next-line no-empty
    } catch {}
    setShowRestore(false);
  };

  // ── Discard ────────────────────────────────────────────────────────────────
  const discardSaved = () => {
    // eslint-disable-next-line no-empty
    try { localStorage.removeItem(saveKey); } catch {}
    setShowRestore(false);
  };

  return { showRestore, setShowRestore, restoreGame, discardSaved };
}
