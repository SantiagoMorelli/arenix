import { Target, Zap, Shield, Hand, X, ArrowDownToLine, ArrowUp, Volleyball, HelpCircle } from "lucide-react";

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

// Error subtypes for the points-by-error-type breakdown in player detail.
// `id` matches `errorType` on log entries; entries written before this existed
// have errorType: null and bucket under "untyped".
export const ERROR_SUBTYPES = [
  { id: "net",     label: "Net",     icon: ArrowDownToLine },
  { id: "out",     label: "Out",     icon: ArrowUp         },
  { id: "serve",   label: "Serve",   icon: Volleyball      },
  { id: "other",   label: "Other",   icon: HelpCircle      },
  { id: "untyped", label: "Untyped", icon: HelpCircle      },
];

export const ERROR_SUBTYPE_BY_ID = ERROR_SUBTYPES.reduce((acc, e) => {
  acc[e.id] = e;
  return acc;
}, {});

