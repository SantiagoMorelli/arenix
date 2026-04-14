import React from "react";
import { G, Card, Btn } from "./ui";

const options = [
  {
    id: "tournaments",
    icon: "🏆",
    title: "TOURNAMENT",
    description: "Organize a competition with teams, groups and brackets.",
  },
  {
    id: "freeplay",
    icon: "🎮",
    title: "FREE PLAY",
    description: "Play freely. Create teams, track wins. No end date.",
  },
];

export default function CreateMenuSection({ onChoose }) {
  return (
    <div>
      <h1 style={{
        fontFamily: "'Bebas Neue'", fontSize: 36, color: G.ocean,
        letterSpacing: 2, marginBottom: 8,
      }}>
        ➕ CREATE
      </h1>
      <p style={{ fontSize: 14, color: G.textLight, marginBottom: 28 }}>
        What would you like to start?
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {options.map(opt => (
          <Card
            key={opt.id}
            style={{ cursor: "pointer", padding: 0, overflow: "hidden" }}
            onClick={() => onChoose(opt.id)}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 20,
              padding: "24px 20px",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = G.sand}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{
                fontSize: 48, lineHeight: 1,
                background: G.sand, borderRadius: 16,
                width: 72, height: 72, display: "flex",
                alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {opt.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Bebas Neue'", fontSize: 26,
                  color: G.ocean, letterSpacing: 1, lineHeight: 1, marginBottom: 6,
                }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: 13, color: G.textLight, lineHeight: 1.4 }}>
                  {opt.description}
                </div>
              </div>
              <div style={{ fontSize: 20, color: G.oceanLight, flexShrink: 0 }}>›</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
