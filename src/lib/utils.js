export const uid = () => Math.random().toString(36).slice(2, 8);

export const now = () => new Date().toLocaleDateString("en-US");

export const LEVELS = [
  { id: "beginner",     label: "Beginner",     color: "#2ECC71", icon: "🟢" },
  { id: "intermediate", label: "Intermediate", color: "#F39C12", icon: "🟡" },
  { id: "advanced",     label: "Advanced",     color: "#E74C3C", icon: "🔴" },
];

export const levelOf = (id) => LEVELS.find(l => l.id === id) || LEVELS[0];
