import { Target, Zap, Shield, Hand, X, Volleyball, HelpCircle } from "lucide-react";

/**
 * Canonical list of point types used across stats components.
 * `id` matches `pointType` on log entries written by useLiveGame.
 */
export const POINT_TYPES = [
  { id: "ace",   label: "Ace",         icon: Target },
  { id: "spike", label: "Spike",       icon: Zap    },
  { id: "block", label: "Block",       icon: Shield },
  { id: "tip",   label: "Tip",         icon: Hand   },
  { id: "error", label: "Rival error", icon: X      },
];

export const POINT_TYPE_BY_ID = POINT_TYPES.reduce((acc, pt) => {
  acc[pt.id] = pt;
  return acc;
}, {});

// Error subtypes — action-based: describes WHAT the player was doing when they
// erred. `id` matches `errorType` on log entries written after this change.
// Legacy entries (errorType: "net" | "out") are mapped to "other" via
// normalizeErrorType() below; "serve" maps to "serve" unchanged.
export const ERROR_SUBTYPES = [
  { id: "spike",   label: "Spike",   icon: Zap         },
  { id: "tip",     label: "Tip",     icon: Hand        },
  { id: "serve",   label: "Serve",   icon: Volleyball  },
  { id: "other",   label: "Other",   icon: HelpCircle  },
  { id: "untyped", label: "Untyped", icon: HelpCircle  },
];

export const ERROR_SUBTYPE_BY_ID = ERROR_SUBTYPES.reduce((acc, e) => {
  acc[e.id] = e;
  return acc;
}, {});

/**
 * Maps a raw `errorType` value from any log entry (old or new) to one of the
 * canonical action-based ids: "spike" | "tip" | "serve" | "other" | "untyped".
 *
 * Legacy mapping:
 *   "net"  → "other"   (could have been any action — no action context saved)
 *   "out"  → "other"
 *   "serve"→ "serve"   (unchanged — serve errors were always action-specific)
 *   null   → "untyped" (pre-feature entry)
 */
export function normalizeErrorType(raw) {
  if (raw === "spike" || raw === "tip" || raw === "serve" || raw === "other") return raw;
  if (raw === "net" || raw === "out") return "other";
  return "untyped";
}

