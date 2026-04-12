import { G } from "../components/ui";

export const uid = () => Math.random().toString(36).slice(2, 8);

export const now = () => new Date().toLocaleDateString("es-UY");

export const LEVELS = [
  { id: "beginner",     label: "Beginner",   color: G.success, icon: "🟢" },
  { id: "intermediate", label: "Intermedio", color: G.warn,    icon: "🟡" },
  { id: "advanced",     label: "Avanzado",   color: G.danger,  icon: "🔴" },
];

export const levelOf = (id) => LEVELS.find(l => l.id === id) || LEVELS[0];
