import { useState } from “react”;

/*
╔══════════════════════════════════════════════════════╗
║  Beach Volleyball App — React + Vite + Tailwind CSS  ║
║  Mobile-first PWA wireframe                          ║
║  Toggle “Show Tailwind” to see actual class names    ║
╚══════════════════════════════════════════════════════╝
*/

const THEMES = {
dark: {
bg: “#0F1923”, surface: “#1A2734”, alt: “#243447”,
accent: “#F5A623”, accentS: “rgba(245,166,35,0.15)”,
tx: “#E8ECF1”, dim: “#7A8EA0”, ok: “#2ECC71”,
ln: “#2A3A4A”, teal: “#00BCD4”, tealS: “rgba(0,188,212,0.15)”,
shell: “#080E14”, sh: “0 24px 64px rgba(0,0,0,0.5)”,
},
light: {
bg: “#F5F6F8”, surface: “#FFF”, alt: “#EDF0F4”,
accent: “#E8850C”, accentS: “rgba(232,133,12,0.10)”,
tx: “#1A1D23”, dim: “#6B7280”, ok: “#16A34A”,
ln: “#E2E5EB”, teal: “#0891B2”, tealS: “rgba(8,145,178,0.08)”,
shell: “#E8EBF0”, sh: “0 24px 64px rgba(0,0,0,0.08)”,
},
};

// ─── Icons ───
const I = ({ d, s = 20, c }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ico = {
home: c => <I c={c} d={<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}/>,
trophy: c => <I c={c} d={<><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></>}/>,
users: c => <I c={c} d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>}/>,
play: c => <I c={c} d={<><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill={c}/></>}/>,
back: c => <I c={c} d={<polyline points="15 18 9 12 15 6"/>}/>,
plus: c => <I c={c} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>,
gear: c => <I c={c} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>}/>,
chart: c => <I c={c} d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}/>,
star: c => <I c={c} d={<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>}/>,
ball: c => <I c={c} d={<><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20"/><path d="M2 12a14.5 14.5 0 0120 0"/></>}/>,
};

// ─── Phone Frame ───
const Phone = ({ children, t }) => (

  <div style={{
    width: 320, maxWidth: "100%", height: 640, background: t.bg, borderRadius: 36,
    border: `3px solid ${t.ln}`, overflow: "hidden",
    display: "flex", flexDirection: "column", boxShadow: t.sh,
  }}>
    <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontSize: 12, color: t.dim, fontWeight: 600 }}>
      <span>9:41</span><span>●●●● 🔋</span>
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>{children}</div>
    <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 120, height: 4, background: t.alt, borderRadius: 2 }}/>
    </div>
  </div>
);

// ─── Tab Bar ───
const TabBar = ({ items, active, t, accent = t.accent }) => (

  <div style={{ display: "flex", borderTop: `1px solid ${t.ln}`, background: t.surface, padding: "6px 0 2px" }}>
    {items.map(i => (
      <div key={i.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", padding: "4px 0" }}>
        {ico[i.ic](active === i.id ? accent : t.dim)}
        <span style={{ fontSize: 10, fontWeight: 600, color: active === i.id ? accent : t.dim }}>{i.lb}</span>
      </div>
    ))}
  </div>
);

// ─── Tailwind class label ───
const TW = ({ children, cls, t, show }) => {
if (!show) return children;
return (
<div style={{ position: “relative” }}>
{children}
<div style={{
position: “absolute”, top: -8, right: -2, fontSize: 8,
fontFamily: “‘Fira Code’,monospace”, color: t.accent,
background: t.accentS, padding: “2px 6px”, borderRadius: 4,
whiteSpace: “nowrap”, fontWeight: 600, lineHeight: 1.3,
pointerEvents: “none”, zIndex: 10, border: `1px solid ${t.accent}30`,
}}>{cls}</div>
</div>
);
};

// ─── HOME ───
const Home = ({ t, tw }) => (
<>
<div style={{ flex: 1, padding: “0 16px”, overflowY: “auto” }}>
<div style={{ padding: “12px 0 20px”, display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div>
<div style={{ fontSize: 13, color: t.dim, fontWeight: 500 }}>Welcome back</div>
<div style={{ fontSize: 22, fontWeight: 700, color: t.tx }}>Santi 🏐</div>
</div>
<div style={{ width: 38, height: 38, borderRadius: 12, background: t.alt, display: “flex”, alignItems: “center”, justifyContent: “center” }}>
{ico.gear(t.dim)}
</div>
</div>

```
  <TW show={tw} t={t} cls="bg-surface rounded-2xl p-5 border border-accent/40">
    <div style={{ background: `linear-gradient(135deg, ${t.surface}, ${t.alt})`, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${t.accent}40` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>My League</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: t.tx }}>Miami Beach League</div>
          <div style={{ fontSize: 12, color: t.dim, marginTop: 2 }}>Season 2026 · 24 players</div>
        </div>
        <TW show={tw} t={t} cls="bg-accent/15 rounded-lg px-3 py-1.5">
          <div style={{ background: t.accentS, borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, color: t.accent }}>#3 Rank</div>
        </TW>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[{ n: "3", l: "Tournaments" }, { n: "12", l: "Matches" }, { n: "8W-4L", l: "Record" }].map(s => (
          <div key={s.l} style={{ flex: 1, background: t.bg, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.tx }}>{s.n}</div>
            <div style={{ fontSize: 9, color: t.dim, marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  </TW>

  <TW show={tw} t={t} cls="bg-teal/10 rounded-2xl p-4 flex items-center gap-3.5">
    <div style={{ background: `linear-gradient(135deg, ${t.tealS}, ${t.surface})`, borderRadius: 16, padding: 16, marginBottom: 18, border: `1px solid ${t.teal}30`, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: t.tealS, display: "flex", alignItems: "center", justifyContent: "center" }}>{ico.play(t.teal)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.tx }}>Free Play</div>
        <div style={{ fontSize: 11, color: t.dim }}>Quick match · Any players · No league</div>
      </div>
      {ico.plus(t.teal)}
    </div>
  </TW>

  <div style={{ fontSize: 12, fontWeight: 700, color: t.dim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Recent</div>
  {[
    { title: "Spring Cup", sub: "Tournament · Final round", badge: "LIVE", bc: t.ok, ic: "trophy", icC: t.accent, bgC: t.accentS },
    { title: "Free Play", sub: "Yesterday · 4 players", badge: "Done", bc: t.dim, ic: "ball", icC: t.teal, bgC: t.tealS },
  ].map((a, i) => (
    <TW key={i} show={tw && i === 0} t={t} cls="bg-surface rounded-xl p-3 flex items-center gap-3 border border-line">
      <div style={{ background: t.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${t.ln}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: a.bgC, display: "flex", alignItems: "center", justifyContent: "center" }}>{ico[a.ic](a.icC)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.tx }}>{a.title}</div>
          <div style={{ fontSize: 11, color: t.dim }}>{a.sub}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: a.bc, background: `${a.bc}20`, padding: "3px 8px", borderRadius: 6 }}>{a.badge}</span>
      </div>
    </TW>
  ))}
</div>
<TabBar t={t} items={[{ id: "home", ic: "home", lb: "Home" }, { id: "prof", ic: "star", lb: "Profile" }]} active="home" />
```

</>
);

// ─── LEAGUE ───
const League = ({ t }) => (
<>
<div style={{ flex: 1, padding: “0 16px”, overflowY: “auto” }}>
<div style={{ padding: “10px 0 16px”, display: “flex”, alignItems: “center”, gap: 10 }}>
<div style={{ cursor: “pointer” }}>{ico.back(t.tx)}</div>
<div><div style={{ fontSize: 18, fontWeight: 700, color: t.tx }}>Miami Beach League</div><div style={{ fontSize: 11, color: t.dim }}>Season 2026</div></div>
</div>
<div style={{ fontSize: 12, fontWeight: 700, color: t.accent, letterSpacing: 1, textTransform: “uppercase”, marginBottom: 10 }}>Top Rankings</div>
<div style={{ background: t.surface, borderRadius: 14, overflow: “hidden”, border: `1px solid ${t.ln}`, marginBottom: 18 }}>
{[“Carlos M.”, “Santi”, “Diego R.”, “Ana P.”, “Luis K.”].map((p, i) => (
<div key={i} style={{ display: “flex”, alignItems: “center”, padding: “10px 14px”, borderBottom: i < 4 ? `1px solid ${t.ln}` : “none”, background: i === 1 ? t.accentS : “transparent” }}>
<span style={{ width: 22, fontSize: 13, fontWeight: 700, color: i < 3 ? t.accent : t.dim }}>{i + 1}</span>
<div style={{ width: 28, height: 28, borderRadius: 8, background: t.alt, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: 12, fontWeight: 600, color: t.tx, marginRight: 10 }}>{p[0]}</div>
<span style={{ flex: 1, fontSize: 13, fontWeight: i === 1 ? 700 : 500, color: t.tx }}>{p}</span>
<span style={{ fontSize: 12, fontWeight: 600, color: t.dim }}>{[1520, 1485, 1460, 1440, 1420][i]}</span>
</div>
))}
</div>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 10 }}>
<span style={{ fontSize: 12, fontWeight: 700, color: t.accent, letterSpacing: 1, textTransform: “uppercase” }}>Tournaments</span>
<div style={{ display: “flex”, alignItems: “center”, gap: 4, fontSize: 11, fontWeight: 600, color: t.accent, cursor: “pointer” }}>{ico.plus(t.accent)} New</div>
</div>
{[{ nm: “Spring Cup”, st: “In Progress”, sc: t.ok, n: 8 }, { nm: “Winter Clash”, st: “Completed”, sc: t.dim, n: 12 }].map((x, i) => (
<div key={i} style={{ background: t.surface, borderRadius: 12, padding: “12px 14px”, marginBottom: 8, display: “flex”, alignItems: “center”, gap: 12, border: `1px solid ${t.ln}` }}>
<div style={{ width: 36, height: 36, borderRadius: 10, background: t.accentS, display: “flex”, alignItems: “center”, justifyContent: “center” }}>{ico.trophy(t.accent)}</div>
<div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.tx }}>{x.nm}</div><div style={{ fontSize: 11, color: t.dim }}>{x.n} players</div></div>
<span style={{ fontSize: 10, fontWeight: 600, color: x.sc, background: `${x.sc}20`, padding: “3px 8px”, borderRadius: 6 }}>{x.st}</span>
</div>
))}
</div>
<TabBar t={t} items={[{ id: “r”, ic: “chart”, lb: “Rankings” }, { id: “p”, ic: “users”, lb: “Players” }, { id: “t”, ic: “trophy”, lb: “Tournaments” }, { id: “s”, ic: “gear”, lb: “Settings” }]} active=“r” />
</>
);

// ─── TOURNAMENT ───
const Tournament = ({ t }) => (

  <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
    <div style={{ padding: "10px 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ cursor: "pointer" }}>{ico.back(t.tx)}</div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 18, fontWeight: 700, color: t.tx }}>Spring Cup</div><div style={{ fontSize: 11, color: t.dim }}>Miami Beach League · 8 players</div></div>
      <span style={{ fontSize: 10, fontWeight: 700, color: t.ok, background: `${t.ok}20`, padding: "4px 10px", borderRadius: 8 }}>LIVE</span>
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Teams</div>
    {[{ nm: "Team Alpha", p: ["Carlos M.", "Ana P."], w: 2, l: 0 }, { nm: "Team Bravo", p: ["Santi", "Diego R."], w: 1, l: 1 }, { nm: "Team Charlie", p: ["Luis K.", "Maria S."], w: 1, l: 1 }, { nm: "Team Delta", p: ["Pedro L.", "Sofia V."], w: 0, l: 2 }].map((x, i) => (
      <div key={i} style={{ background: t.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${t.ln}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 14, fontWeight: 700, color: t.tx }}>{x.nm}</span><span style={{ fontSize: 12, fontWeight: 600, color: t.dim }}>{x.w}W-{x.l}L</span></div>
        <div style={{ display: "flex", gap: 6 }}>{x.p.map(p => <span key={p} style={{ fontSize: 11, color: t.accent, background: t.accentS, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{p}</span>)}</div>
      </div>
    ))}
    <div style={{ fontSize: 12, fontWeight: 700, color: t.ok, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginTop: 10 }}>Current Match</div>
    <div style={{ background: `linear-gradient(135deg,${t.surface},${t.alt})`, borderRadius: 16, padding: 18, border: `1px solid ${t.ok}40` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ textAlign: "center", flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: t.dim, marginBottom: 4 }}>Team Alpha</div><div style={{ fontSize: 32, fontWeight: 800, color: t.accent }}>15</div></div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.dim, padding: "4px 10px", background: t.bg, borderRadius: 8 }}>SET 2</div>
        <div style={{ textAlign: "center", flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: t.dim, marginBottom: 4 }}>Team Bravo</div><div style={{ fontSize: 32, fontWeight: 800, color: t.tx }}>12</div></div>
      </div>
      <div style={{ marginTop: 14, background: t.accent, borderRadius: 10, padding: "10px 0", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#FFF", cursor: "pointer" }}>Open Match Controls</div>
    </div>
  </div>
);

// ─── FREE PLAY ───
const FreePlay = ({ t }) => (

  <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
    <div style={{ padding: "10px 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ cursor: "pointer" }}>{ico.back(t.tx)}</div>
      <div><div style={{ fontSize: 18, fontWeight: 700, color: t.tx }}>Free Play</div><div style={{ fontSize: 11, color: t.dim }}>Quick match · No league</div></div>
    </div>
    <div style={{ background: t.tealS, borderRadius: 14, padding: 16, border: `1px solid ${t.teal}30`, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: t.teal, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Players (4)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["Santi", "Marco T.", "Julia R.", "Alex W."].map(p => <span key={p} style={{ fontSize: 12, color: t.tx, background: t.surface, padding: "6px 12px", borderRadius: 8, fontWeight: 500, border: `1px solid ${t.ln}` }}>{p}</span>)}
        <span style={{ fontSize: 12, color: t.teal, padding: "6px 12px", borderRadius: 8, fontWeight: 600, border: `1px dashed ${t.teal}60`, cursor: "pointer" }}>+ Add</span>
      </div>
    </div>
    <div style={{ fontSize: 12, fontWeight: 700, color: t.teal, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Teams</div>
    {[{ nm: "Team 1", p: ["Santi", "Marco T."] }, { nm: "Team 2", p: ["Julia R.", "Alex W."] }].map((x, i) => (
      <div key={i} style={{ background: t.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${t.ln}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.tx, marginBottom: 6 }}>{x.nm}</div>
        <div style={{ display: "flex", gap: 6 }}>{x.p.map(p => <span key={p} style={{ fontSize: 11, color: t.teal, background: t.tealS, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{p}</span>)}</div>
      </div>
    ))}
    <div style={{ marginTop: 10, background: t.teal, borderRadius: 12, padding: "14px 0", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#FFF", cursor: "pointer" }}>Start Match</div>
    <div style={{ fontSize: 12, fontWeight: 700, color: t.teal, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginTop: 20 }}>Session Rankings</div>
    <div style={{ background: t.surface, borderRadius: 12, border: `1px solid ${t.ln}` }}>
      {["Santi", "Julia R.", "Marco T.", "Alex W."].map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: i < 3 ? `1px solid ${t.ln}` : "none" }}>
          <span style={{ width: 20, fontSize: 13, fontWeight: 700, color: i === 0 ? t.teal : t.dim }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.tx, marginLeft: 8 }}>{p}</span>
          <span style={{ fontSize: 11, color: t.dim }}>{[3, 2, 1, 0][i]}W</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── CLAUDE CODE PROMPTS PANEL ───
const PromptsPanel = ({ t }) => {
const [open, setOpen] = useState(null);
const mono = “‘Fira Code’,monospace”;

const prompts = [
{
step: “1”,
title: “Install Tailwind CSS”,
prompt: `Install Tailwind CSS v4 in this Vite + React project. Configure it with these custom colors in tailwind.config.js:

colors: {
bg: { DEFAULT: ‘#F5F6F8’, dark: ‘#0F1923’ },
surface: { DEFAULT: ‘#FFFFFF’, dark: ‘#1A2734’ },
‘surface-alt’: { DEFAULT: ‘#EDF0F4’, dark: ‘#243447’ },
accent: { DEFAULT: ‘#E8850C’, dark: ‘#F5A623’ },
dim: { DEFAULT: ‘#6B7280’, dark: ‘#7A8EA0’ },
free: { DEFAULT: ‘#0891B2’, dark: ‘#00BCD4’ },
success: { DEFAULT: ‘#16A34A’, dark: ‘#2ECC71’ },
line: { DEFAULT: ‘#E2E5EB’, dark: ‘#2A3A4A’ },
}

Enable dark mode with class strategy. Add DM Sans font from Google Fonts. Don’t modify any existing components yet.`, }, { step: "2", title: "Restructure navigation", prompt: `Restructure the React Router navigation to match this hierarchy:

/ → Home screen (shows league cards + Free Play button)
Bottom nav: Home | Profile

/league/:id → League detail with CONTEXTUAL bottom nav:
Rankings | Players | Tournaments | Settings

/league/:id/tournament/:tournamentId → Tournament detail (NO bottom nav, back button to league)

/free-play → Free Play flow (NO bottom nav, back button to home)
/free-play/:sessionId → Active free play session

The bottom nav should be a shared component that receives different tabs depending on the route. Tournament and Free Play are full-screen pages with a top back-arrow, no tab bar.

IMPORTANT: Keep all existing Supabase queries, auth logic, hooks, context providers, and business logic exactly as they are. Only change routing structure and layout wrappers.`, }, { step: "3", title: "Create shared UI components", prompt: `Create a set of shared UI components in src/components/ui/ using Tailwind CSS classes. These components will be reused across all screens:

1. Card — rounded-2xl surface background with border, padding, optional gradient
1. Badge — small colored pill (accent, free, success, dim variants)
1. BottomNav — fixed bottom tab bar that accepts an array of {icon, label, path, active}
1. ListItem — flex row with icon, title, subtitle, and right-side content
1. SectionHeader — uppercase tracking-wide label with optional right action
1. ScoreBoard — two teams with large score numbers and set indicator
1. PlayerChip — small rounded tag showing player name (accent or free variant)
1. StatBox — small centered box with number + label below

Use the custom Tailwind colors from tailwind.config.js (bg-surface, text-accent, border-line, etc). Support dark mode with dark: prefix classes. Make them mobile-first with touch-friendly sizing (min 44px tap targets).

Do NOT touch any Supabase code, hooks, or business logic.`, }, { step: "4", title: "Restyle screens one by one", prompt: `Now restyle the Home screen using the shared UI components and Tailwind CSS classes. Replace all existing inline styles or CSS modules with Tailwind className props.

The Home screen should show:

- Header with “Welcome back” + user name + settings icon
- League card (Card component with gradient, stats row using StatBox)
- Free Play button (Card with teal theme, play icon, “Quick match” subtitle)
- Recent activity list (ListItem components with Badge for status)
- Bottom nav with Home (active) and Profile tabs

Use mobile-first design: full-width cards, generous padding, 16px side margins. Touch targets at least 44px.

CRITICAL: Do NOT modify any useState, useEffect, Supabase queries, auth checks, data fetching, context usage, or any business logic. Only change the JSX structure and className styling.

After Home is done, I’ll ask you to do the same for League, Tournament, and Free Play screens.`,
},
];

return (
<div style={{ width: “100%”, maxWidth: 420, marginTop: 24 }}>
<div style={{ fontSize: 15, fontWeight: 700, color: t.tx, marginBottom: 4, textAlign: “center” }}>Claude Code Prompts</div>
<div style={{ fontSize: 12, color: t.dim, marginBottom: 16, textAlign: “center” }}>Run these in order from your project root</div>
{prompts.map((p, i) => (
<div key={i} style={{ marginBottom: 10 }}>
<div
onClick={() => setOpen(open === i ? null : i)}
style={{
background: t.surface, borderRadius: open === i ? “12px 12px 0 0” : 12,
padding: “12px 16px”, display: “flex”, alignItems: “center”, gap: 12,
border: `1px solid ${open === i ? t.accent : t.ln}`,
borderBottom: open === i ? “none” : undefined,
cursor: “pointer”, transition: “all 0.15s”,
}}
>
<div style={{ width: 30, height: 30, borderRadius: 8, background: t.accentS, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: 14, fontWeight: 800, color: t.accent, flexShrink: 0 }}>{p.step}</div>
<div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.tx }}>{p.title}</div>
<span style={{ fontSize: 18, color: t.dim, transform: open === i ? “rotate(180deg)” : “none”, transition: “transform 0.15s” }}>▾</span>
</div>
{open === i && (
<div style={{
background: mode === “dark” ? “#0A1018” : “#F0F2F6”,
borderRadius: “0 0 12px 12px”, padding: “14px 16px”,
border: `1px solid ${t.accent}`, borderTop: `1px solid ${t.accent}30`,
}}>
<div style={{ fontSize: 10, fontWeight: 600, color: t.accent, marginBottom: 8, fontFamily: mono, letterSpacing: 0.5 }}>PASTE THIS IN CLAUDE CODE:</div>
<pre style={{
fontSize: 11, lineHeight: 1.6, color: t.tx, fontFamily: mono,
whiteSpace: “pre-wrap”, wordBreak: “break-word”, margin: 0,
}}>{p.prompt}</pre>
</div>
)}
</div>
))}
<div style={{
marginTop: 16, background: `${t.ok}12`, border: `1px solid ${t.ok}30`,
borderRadius: 12, padding: “12px 16px”, fontSize: 12, lineHeight: 1.6, color: t.tx,
}}>
<strong style={{ color: t.ok }}>Golden rule:</strong> Every prompt includes “do NOT modify Supabase code, hooks, or business logic.” This ensures Claude Code only touches the visual layer while your core app stays intact.
</div>
</div>
);
};

// ─── MAIN ───
export default function App() {
const [screen, setScreen] = useState(“home”);
const [mode, setMode] = useState(“dark”);
const [tw, setTw] = useState(false);
const [panel, setPanel] = useState(“preview”);
const t = THEMES[mode];

return (
<div style={{
minHeight: “100vh”, background: t.shell,
display: “flex”, flexDirection: “column”, alignItems: “center”,
padding: “24px 16px 48px”,
fontFamily: “‘DM Sans’,-apple-system,sans-serif”,
}}>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet" />

```
  <h2 style={{ color: t.tx, fontSize: 20, fontWeight: 700, marginBottom: 4, letterSpacing: -0.5 }}>React + Vite + Tailwind</h2>
  <p style={{ color: t.dim, fontSize: 12, marginBottom: 20, textAlign: "center", maxWidth: 360 }}>
    Mobile-first PWA design system for your beach volleyball app
  </p>

  {/* Mode tabs */}
  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
    {[{ id: "preview", lb: "Preview" }, { id: "prompts", lb: "Claude Code Prompts" }].map(p => (
      <button key={p.id} onClick={() => setPanel(p.id)} style={{
        background: panel === p.id ? t.accent : t.surface,
        color: panel === p.id ? "#FFF" : t.dim,
        border: `1px solid ${panel === p.id ? t.accent : t.ln}`,
        borderRadius: 10, padding: "8px 16px", fontSize: 12,
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}>{p.lb}</button>
    ))}
  </div>

  {panel === "preview" && (
    <>
      {/* Controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")} style={{
          background: t.surface, color: t.tx, border: `1px solid ${t.ln}`,
          borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>{mode === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
        <button onClick={() => setTw(v => !v)} style={{
          background: tw ? t.accent : t.surface, color: tw ? "#FFF" : t.tx,
          border: `1px solid ${tw ? t.accent : t.ln}`,
          borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>{tw ? "✨ Tailwind ON" : "<> Tailwind"}</button>
      </div>

      {/* Screen selector */}
      <div style={{ display: "flex", gap: 5, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
        {[{ id: "home", lb: "Home" }, { id: "league", lb: "League" }, { id: "tournament", lb: "Tournament" }, { id: "freeplay", lb: "Free Play" }].map(s => (
          <button key={s.id} onClick={() => setScreen(s.id)} style={{
            background: screen === s.id ? t.accent : "transparent",
            color: screen === s.id ? "#FFF" : t.dim,
            border: `1px solid ${screen === s.id ? t.accent : t.ln}`,
            borderRadius: 8, padding: "5px 11px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>{s.lb}</button>
        ))}
      </div>

      <Phone t={t}>
        {{ home: <Home t={t} tw={tw} />, league: <League t={t} />, tournament: <Tournament t={t} />, freeplay: <FreePlay t={t} /> }[screen]}
      </Phone>

      <div style={{ marginTop: 16, maxWidth: 320, textAlign: "center", color: t.dim, fontSize: 11, lineHeight: 1.5, background: t.surface, borderRadius: 10, padding: "10px 14px", border: `1px solid ${t.ln}` }}>
        {{ home: "🏠 Home — entry point. League card + Free Play. Tabs: Home, Profile.", league: "🏆 League — contextual tabs: Rankings, Players, Tournaments, Settings.", tournament: "🏐 Tournament — pushed screen, no tabs. Teams + live scoreboard.", freeplay: "⚡ Free Play — independent flow. Session-scoped rankings." }[screen]}
      </div>
    </>
  )}

  {panel === "prompts" && <PromptsPanel t={t} />}
</div>
```

);
}