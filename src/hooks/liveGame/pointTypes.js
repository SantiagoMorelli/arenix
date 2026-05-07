// Module-level constant — not recreated per render.
export const POINT_TYPES = [
  { id: "ace",   label: "Ace",         icon: "🎯", desc: "Serve ace" },
  { id: "spike", label: "Spike",       icon: "💥", desc: "Attack winner" },
  { id: "block", label: "Block",       icon: "🛡️", desc: "Net block" },
  { id: "tip",   label: "Tip",         icon: "🤏", desc: "Tip/dink shot" },
  { id: "error", label: "Rival error", icon: "❌", desc: "The opponent made the error" },
];

// Error subtypes captured when pointType === "error". Describes the ACTION
// that caused the error, not where the ball went.
// Old log entries written before this field existed have errorType: null and
// surface as "Untyped". Old entries with errorType "net" or "out" are mapped
// to "other" at read-time; "serve" maps to "serve" unchanged.
export const ERROR_SUBTYPES = [
  { id: "spike", label: "Spike",   icon: "💥", desc: "Attack error (net or out)" },
  { id: "tip",   label: "Tip",     icon: "🤏", desc: "Tip/dink error" },
  { id: "serve", label: "Serve",   icon: "🏐", desc: "Missed serve" },
  { id: "other", label: "Other",   icon: "❔", desc: "Second touch, reception, or rotation mistake" },
];

