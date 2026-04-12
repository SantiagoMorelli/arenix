import { G } from "../components/ui";

export const uid = () => Math.random().toString(36).slice(2, 8);

export const now = () => new Date().toLocaleDateString("en-US");

export const LEVELS = [
  { id: "beginner",     label: "Beginner",     color: G.success, icon: "🟢" },
  { id: "intermediate", label: "Intermediate", color: G.warn,    icon: "🟡" },
  { id: "advanced",     label: "Advanced",     color: G.danger,  icon: "🔴" },
];

export const levelOf = (id) => LEVELS.find(l => l.id === id) || LEVELS[0];
