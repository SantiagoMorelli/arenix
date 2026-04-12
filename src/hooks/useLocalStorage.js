import { useState, useEffect } from "react";

export function useLocalStorage(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      // stored !== null distinguishes "never set" from "set to [] or null"
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {} // quota exceeded or private browsing — data still lives in memory
  }, [key, state]);

  return [state, setState];
}
