import React from "react";

// ── Palette & Global Style ──────────────────────────────────────────────────
export const G = {
  sand: "#F5E6C8",
  sandDark: "#E8D0A0",
  ocean: "#1A6B8A",
  oceanDark: "#0E4A63",
  oceanLight: "#2A9CC5",
  sky: "#87CEEB",
  sun: "#F5A623",
  sunDark: "#E8901A",
  white: "#FFFFFF",
  dark: "#1A1A2E",
  darkMid: "#16213E",
  text: "#2C1810",
  textLight: "#6B4C3B",
  success: "#2ECC71",
  danger: "#E74C3C",
  warn: "#F39C12",
};

export const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${G.sand}; color: ${G.text}; min-height: 100vh; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${G.sandDark}; }
  ::-webkit-scrollbar-thumb { background: ${G.ocean}; border-radius: 3px; }
`;

// ── Reusable UI Components ───────────────────────────────────────────────────
export const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: G.white, borderRadius: 16, padding: "20px 24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)", ...style,
  }}>{children}</div>
);

export const Btn = ({ children, onClick, variant = "primary", size = "md", style = {}, disabled = false }) => {
  const colors = {
    primary: { bg: G.ocean, hover: G.oceanDark, color: G.white },
    secondary: { bg: G.sand, hover: G.sandDark, color: G.text },
    danger: { bg: G.danger, hover: "#C0392B", color: G.white },
    success: { bg: G.success, hover: "#27AE60", color: G.white },
    sun: { bg: G.sun, hover: G.sunDark, color: G.white },
  };
  const c = colors[variant];
  const pad = size === "sm" ? "6px 14px" : size === "lg" ? "14px 28px" : "10px 20px";
  const fs = size === "sm" ? 13 : size === "lg" ? 17 : 15;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: c.bg, color: c.color, border: "none", borderRadius: 10,
      padding: pad, fontSize: fs, fontFamily: "'DM Sans', sans-serif",
      fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, transition: "all 0.15s", ...style,
    }}
      onMouseEnter={e => !disabled && (e.target.style.background = c.hover)}
      onMouseLeave={e => !disabled && (e.target.style.background = c.bg)}
    >{children}</button>
  );
};

export const Badge = ({ children, color = G.ocean }) => (
  <span style={{
    background: color + "22", color, borderRadius: 20, padding: "3px 10px",
    fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
  }}>{children}</span>
);

export const Input = ({ value, onChange, placeholder, style = {} }) => (
  <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{
      border: "2px solid " + G.sandDark, borderRadius: 10, padding: "9px 14px",
      fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: G.text,
      background: G.white, outline: "none", width: "100%",
      transition: "border 0.15s", ...style,
    }}
    onFocus={e => e.target.style.borderColor = G.ocean}
    onBlur={e => e.target.style.borderColor = G.sandDark}
  />
);

export const Select = ({ value, onChange, children, style = {} }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{
      border: "2px solid " + G.sandDark, borderRadius: 10, padding: "9px 14px",
      fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: G.text,
      background: G.white, outline: "none", width: "100%",
      cursor: "pointer", ...style,
    }}
  >{children}</select>
);

export const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: G.white, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480,
      maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 26, color: G.ocean, letterSpacing: 1 }}>{title}</h2>
        <button onClick={onClose} style={{
          background: "none", border: "none", fontSize: 22, cursor: "pointer", color: G.textLight, lineHeight: 1,
        }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
