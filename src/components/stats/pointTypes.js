import { Target, Zap, Shield, Hand, X } from "lucide-react";

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
