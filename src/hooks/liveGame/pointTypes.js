// Module-level constant — not recreated per render.
export const POINT_TYPES = [
  { id: "ace",   label: "Ace",         icon: "🎯", desc: "Serve ace" },
  { id: "spike", label: "Spike",       icon: "💥", desc: "Attack winner" },
  { id: "block", label: "Block",       icon: "🛡️", desc: "Net block" },
  { id: "tip",   label: "Tip",         icon: "🤏", desc: "Tip/dink shot" },
  { id: "error", label: "Rival error", icon: "❌", desc: "The opponent made the error" },
];

// Error subtypes captured when pointType === "error". Old log entries written
// before this field existed have errorType: null and surface as "Untyped".
export const ERROR_SUBTYPES = [
  { id: "net",   label: "Net",     icon: "🪤", desc: "Hit into the net" },
  { id: "out",   label: "Out",     icon: "🚀", desc: "Sent it out of bounds" },
  { id: "serve", label: "Serve",   icon: "🏐", desc: "Missed serve" },
  { id: "other", label: "Other",   icon: "❔", desc: "Mishandled / receive / rotation" },
];

