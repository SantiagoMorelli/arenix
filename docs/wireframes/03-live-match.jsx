import { useState } from “react”;

// Same exact theme tokens as tailwind-guide.jsx
const THEMES = {
dark: {
bg: “#0F1923”, sf: “#1A2734”, alt: “#243447”,
ac: “#F5A623”, acs: “rgba(245,166,35,0.15)”,
tx: “#E8ECF1”, dm: “#7A8EA0”, ok: “#2ECC71”,
ln: “#2A3A4A”, tl: “#00BCD4”, tls: “rgba(0,188,212,0.15)”,
sh: “#080E14”, shadow: “0 24px 64px rgba(0,0,0,0.5)”,
err: “#E74C3C”, errs: “rgba(231,76,60,0.12)”,
scoreBg: “#0D1B2A”,
},
light: {
bg: “#F5F6F8”, sf: “#FFF”, alt: “#EDF0F4”,
ac: “#E8850C”, acs: “rgba(232,133,12,0.10)”,
tx: “#1A1D23”, dm: “#6B7280”, ok: “#16A34A”,
ln: “#E2E5EB”, tl: “#0891B2”, tls: “rgba(8,145,178,0.08)”,
sh: “#E8EBF0”, shadow: “0 24px 64px rgba(0,0,0,0.08)”,
err: “#DC2626”, errs: “rgba(220,38,38,0.06)”,
scoreBg: “#1A2734”,
},
};

const I = ({ d, s = 20, c }) => (
<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const ic = {
back: c => <I c={c} d={<polyline points="15 18 9 12 15 6"/>}/>,
undo: c => <I c={c} d={<><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>}/>,
};

const Phone = ({ children, t }) => (

  <div style={{
    width: 320, maxWidth: "100%", height: 640, background: t.bg, borderRadius: 36,
    border: `3px solid ${t.ln}`, overflow: "hidden",
    display: "flex", flexDirection: "column", boxShadow: t.shadow,
  }}>
    <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontSize: 12, color: t.dm, fontWeight: 600 }}>
      <span>9:41</span><span>●●●● 🔋</span>
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>{children}</div>
    <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 120, height: 4, background: t.alt, borderRadius: 2 }}/>
    </div>
  </div>
);

const Header = ({ title, sub, t, badge, badgeColor }) => (

  <div style={{ padding: "10px 16px 16px", display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ cursor: "pointer", padding: 4 }}>{ic.back(t.tx)}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: t.tx }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: t.dm }}>{sub}</div>}
    </div>
    {badge && (
      <span style={{
        fontSize: 10, fontWeight: 700, color: badgeColor || t.ac,
        background: `${badgeColor || t.ac}20`, padding: "4px 10px", borderRadius: 8,
      }}>{badge}</span>
    )}
  </div>
);

const Label = ({ children, color, t, style = {} }) => (

  <div style={{
    fontSize: 12, fontWeight: 700, color: color || t.dm,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, ...style,
  }}>{children}</div>
);

// ─── 1. START A GAME ───
const StartGame = ({ t }) => (

  <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
    <Label color={t.ac} t={t}>Team 1</Label>
    <div style={{
      background: t.sf, borderRadius: 12, padding: "12px 14px",
      border: `1px solid ${t.ln}`, marginBottom: 10,
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: t.acs,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: t.ac,
        }}>A</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.tx }}>Team Alpha</div>
          <div style={{ fontSize: 11, color: t.dm }}>Carlos M. · Ana P.</div>
        </div>
      </div>
      <span style={{ fontSize: 11, color: t.dm }}>▾</span>
    </div>

```
<div style={{ textAlign: "center", fontSize: 16, fontWeight: 800, color: t.dm, marginBottom: 10, letterSpacing: 3 }}>VS</div>

<Label color={t.tl} t={t}>Team 2</Label>
<div style={{
  background: t.sf, borderRadius: 12, padding: "12px 14px",
  border: `1px solid ${t.ln}`, marginBottom: 20,
  display: "flex", justifyContent: "space-between", alignItems: "center",
}}>
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10, background: t.tls,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, fontWeight: 700, color: t.tl,
    }}>B</div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.tx }}>Team Bravo</div>
      <div style={{ fontSize: 11, color: t.dm }}>Santi · Diego R.</div>
    </div>
  </div>
  <span style={{ fontSize: 11, color: t.dm }}>▾</span>
</div>

<Label t={t}>Sets per Match</Label>
<div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
  {["1 set", "Best of 3", "Best of 5"].map((s, i) => (
    <div key={s} style={{
      flex: 1, padding: "11px 0", borderRadius: 10, textAlign: "center",
      fontSize: 12, fontWeight: 600, cursor: "pointer",
      background: i === 0 ? t.ac : "transparent",
      color: i === 0 ? "#FFF" : t.dm,
      border: `1px solid ${i === 0 ? t.ac : t.ln}`,
    }}>{s}</div>
  ))}
</div>

<div style={{
  background: t.ac, borderRadius: 12, padding: "14px 0",
  textAlign: "center", fontSize: 14, fontWeight: 700,
  color: "#FFF", cursor: "pointer",
}}>🏐 Start Game</div>
```

  </div>
);

// ─── 2. MATCH SETUP (compact — fits one screen) ───
const MatchSetup = ({ t }) => (

  <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
    {/* Match card */}
    <div style={{
      background: t.sf, borderRadius: 12, padding: "10px 14px",
      border: `1px solid ${t.ln}`, marginBottom: 12,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.ac }}>Team Alpha</div>
        <div style={{ fontSize: 10, color: t.dm }}>Carlos M. · Ana P.</div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.dm, background: t.alt, padding: "3px 8px", borderRadius: 6 }}>VS</div>
      <div style={{ flex: 1, textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.tl }}>Team Bravo</div>
        <div style={{ fontSize: 10, color: t.dm }}>Santi · Diego R.</div>
      </div>
    </div>

```
{/* Serve orders — SIDE BY SIDE */}
<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
  {/* Team Alpha */}
  <div style={{ flex: 1, background: t.sf, borderRadius: 12, padding: "10px 10px", border: `1px solid ${t.ln}` }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: t.ac, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Alpha Order</div>
    {["Carlos M.", "Ana P."].map((p, i) => (
      <div key={p} style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
        background: i === 0 ? t.acs : "transparent",
        borderRadius: 8, padding: "5px 6px",
      }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: t.ac, color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{i + 1}</div>
        <span style={{ fontSize: 11, fontWeight: 600, color: t.tx, flex: 1 }}>{p}</span>
        {i > 0 && <span style={{ fontSize: 12, color: t.dm, cursor: "pointer" }}>↑</span>}
      </div>
    ))}
  </div>
  {/* Team Bravo */}
  <div style={{ flex: 1, background: t.sf, borderRadius: 12, padding: "10px 10px", border: `1px solid ${t.ln}` }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: t.tl, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Bravo Order</div>
    {["Santi", "Diego R."].map((p, i) => (
      <div key={p} style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
        background: i === 0 ? t.tls : "transparent",
        borderRadius: 8, padding: "5px 6px",
      }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: t.tl, color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{i + 1}</div>
        <span style={{ fontSize: 11, fontWeight: 600, color: t.tx, flex: 1 }}>{p}</span>
        {i > 0 && <span style={{ fontSize: 12, color: t.dm, cursor: "pointer" }}>↑</span>}
      </div>
    ))}
  </div>
</div>

{/* First serve + Side — compact row */}
<Label t={t} style={{ marginBottom: 6 }}>First serve</Label>
<div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
  {[{ nm: "Alpha", c: t.ac, on: true }, { nm: "Bravo", c: t.tl, on: false }].map(x => (
    <div key={x.nm} style={{
      flex: 1, padding: "9px 0", borderRadius: 10, textAlign: "center",
      fontSize: 11, fontWeight: 600, cursor: "pointer",
      background: x.on ? `${x.c}20` : "transparent",
      color: x.on ? x.c : t.dm,
      border: `1px solid ${x.on ? x.c : t.ln}`,
    }}>🏐 {x.nm}</div>
  ))}
</div>

<Label t={t} style={{ marginBottom: 6 }}>Alpha starts on</Label>
<div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
  {["← Left", "Right →"].map((s, i) => (
    <div key={s} style={{
      flex: 1, padding: "9px 0", borderRadius: 10, textAlign: "center",
      fontSize: 11, fontWeight: 600, cursor: "pointer",
      background: i === 0 ? t.acs : "transparent",
      color: i === 0 ? t.ac : t.dm,
      border: `1px solid ${i === 0 ? t.ac : t.ln}`,
    }}>{s}</div>
  ))}
</div>

{/* Serve rotation — compact inline */}
<div style={{
  background: t.sf, borderRadius: 12, padding: "8px 12px",
  border: `1px solid ${t.ln}`, marginBottom: 14,
}}>
  <div style={{ fontSize: 10, fontWeight: 700, color: t.ac, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Serve Rotation</div>
  <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
    {[
      { n: "Carlos", c: t.ac, first: true },
      { n: "Santi", c: t.tl },
      { n: "Ana", c: t.ac },
      { n: "Diego", c: t.tl },
    ].map((p, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: p.first ? t.acs : `${p.c}10`,
          borderRadius: 6, padding: "3px 8px",
          border: p.first ? `1px solid ${t.ac}40` : "none",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: p.c }}>{i + 1}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: t.tx }}>{p.n}</span>
        </div>
        {i < 3 && <span style={{ fontSize: 10, color: t.dm }}>→</span>}
      </div>
    ))}
    <span style={{ fontSize: 9, color: t.dm, fontStyle: "italic", marginLeft: 2 }}>↻</span>
  </div>
</div>

{/* CTA */}
<div style={{
  background: t.ok, borderRadius: 12, padding: "14px 0",
  textAlign: "center", fontSize: 14, fontWeight: 700,
  color: "#FFF", cursor: "pointer",
}}>Start Match!</div>
```

  </div>
);

// ─── 3. LIVE SCOREBOARD ───
const LiveScore = ({ t, onPoint }) => (

  <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
    <div style={{ display: "inline-block", background: t.alt, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: t.dm, marginBottom: 12 }}>Set 1 · to 21</div>

```
<div style={{ background: t.scoreBg, borderRadius: 16, padding: "20px 16px 16px", marginBottom: 14 }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#E8ECF1", marginBottom: 2 }}>Team Alpha</div>
      <div style={{ fontSize: 48, fontWeight: 800, color: "#F5A623", lineHeight: 1.1 }}>12</div>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", background: "rgba(245,166,35,0.2)", borderRadius: 8, padding: "5px 12px", marginTop: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#F5A623", textTransform: "uppercase" }}>🏐 Serving</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#E8ECF1" }}>Carlos M.</span>
      </div>
      <div style={{ fontSize: 10, color: "#7A8EA0", marginTop: 6 }}>Sets: 0</div>
    </div>
    <div style={{ fontSize: 14, fontWeight: 800, color: "#7A8EA0", alignSelf: "center", padding: "0 2px" }}>VS</div>
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#E8ECF1", marginBottom: 2 }}>Team Bravo</div>
      <div style={{ fontSize: 48, fontWeight: 800, color: "#7A8EA0", lineHeight: 1.1 }}>9</div>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: "5px 12px", marginTop: 6 }}>
        <span style={{ fontSize: 9, color: "#7A8EA0" }}>If scores:</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#E8ECF1" }}>Santi</span>
      </div>
      <div style={{ fontSize: 10, color: "#7A8EA0", marginTop: 6 }}>Sets: 0</div>
    </div>
  </div>
</div>

<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
  <div onClick={() => onPoint?.("alpha")} style={{ flex: 1, background: t.tl, borderRadius: 12, padding: "14px 0", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#FFF", cursor: "pointer" }}>+1 Team Alpha</div>
  <div onClick={() => onPoint?.("bravo")} style={{ flex: 1, background: t.ac, borderRadius: 12, padding: "14px 0", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#FFF", cursor: "pointer" }}>+1 Team Bravo</div>
</div>

<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 600, color: t.dm, cursor: "pointer", border: `1px solid ${t.ln}` }}>{ic.undo(t.dm)} Undo</div>
  <div style={{ flex: 1, background: t.err, borderRadius: 12, padding: "12px 0", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#FFF", cursor: "pointer" }}>End Match</div>
</div>

<div style={{ background: t.sf, borderRadius: 12, overflow: "hidden", border: `1px solid ${t.ln}` }}>
  <div style={{ padding: "10px 14px", background: t.alt, fontSize: 12, fontWeight: 700, color: t.ac, letterSpacing: 1, textTransform: "uppercase" }}>History</div>
  {[
    { s: "12-9", ev: "Spike by Carlos M.", tm: "Alpha", tc: t.ac, srv: "Ana P." },
    { s: "11-9", ev: "Ace by Ana P.", tm: "Alpha", tc: t.ac, srv: "Ana P." },
    { s: "10-9", ev: "Rival error", tm: "Alpha", tc: t.ac, srv: "Santi" },
    { s: "9-9", ev: "Block by Santi", tm: "Bravo", tc: t.tl, srv: "Santi" },
  ].map((h, i) => (
    <div key={i} style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: i < 3 ? `1px solid ${t.ln}` : "none" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: t.ac, width: 36 }}>{h.s}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: t.tx }}>{h.ev}</div>
        <div style={{ fontSize: 9, color: t.dm }}>🏐 {h.srv}</div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: h.tc, background: h.tm === "Alpha" ? t.acs : t.tls, padding: "2px 6px", borderRadius: 4 }}>{h.tm}</span>
    </div>
  ))}
</div>
```

  </div>
);

// ─── 4. POINT TYPE MODAL ───
const PointTypeModal = ({ t, onSelect }) => (

  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 10 }}>
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}/>
    <div style={{ position: "relative", background: t.bg, borderRadius: "20px 20px 0 0", padding: "16px 16px 20px", zIndex: 2 }}>
      <div style={{ width: 36, height: 4, background: t.alt, borderRadius: 2, margin: "0 auto 14px" }}/>
      <div style={{ background: t.acs, borderRadius: 10, padding: "8px 0", textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: t.dm, textTransform: "uppercase", letterSpacing: 1 }}>Point for</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.ac }}>Team Alpha</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.tx, textAlign: "center", marginBottom: 12 }}>How was the point won?</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[
          { emoji: "🎯", name: "Ace", sub: "Serve ace" },
          { emoji: "💥", name: "Spike", sub: "Attack winner" },
          { emoji: "🛡️", name: "Block", sub: "Net block" },
          { emoji: "🤏", name: "Tip", sub: "Tip/dink shot" },
        ].map(p => (
          <div key={p.name} onClick={() => onSelect?.("who")} style={{
            background: t.sf, borderRadius: 12, padding: "14px 10px",
            textAlign: "center", cursor: "pointer", border: `1px solid ${t.ln}`,
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.tx }}>{p.name}</div>
            <div style={{ fontSize: 10, color: t.dm }}>{p.sub}</div>
          </div>
        ))}
      </div>
      <div onClick={() => onSelect?.("who")} style={{
        background: t.errs, borderRadius: 12, padding: "12px 14px",
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        border: `1px solid ${t.err}25`,
      }}>
        <span style={{ fontSize: 20 }}>❌</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.err }}>Rival error</div>
          <div style={{ fontSize: 10, color: t.dm }}>The opponent made the error</div>
        </div>
      </div>
      <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, fontWeight: 600, color: t.dm, cursor: "pointer", padding: "10px 0" }}>Cancel</div>
    </div>
  </div>
);

// ─── 5. WHO SCORED MODAL ───
const WhoScoredModal = ({ t }) => (

  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 10 }}>
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}/>
    <div style={{ position: "relative", background: t.bg, borderRadius: "20px 20px 0 0", padding: "16px 16px 20px", zIndex: 2 }}>
      <div style={{ width: 36, height: 4, background: t.alt, borderRadius: 2, margin: "0 auto 14px" }}/>
      <div style={{ background: t.acs, borderRadius: 10, padding: "8px 0", textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: t.dm, textTransform: "uppercase", letterSpacing: 1 }}>Point for</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.ac }}>Team Alpha</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.tx, textAlign: "center", marginBottom: 12 }}>Who scored?</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {["Carlos M.", "Ana P."].map(p => (
          <div key={p} style={{
            flex: 1, background: t.sf, borderRadius: 12, padding: "16px 10px",
            textAlign: "center", cursor: "pointer", border: `1px solid ${t.ln}`,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: t.acs, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: t.ac, margin: "0 auto 8px" }}>{p[0]}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.tx }}>{p}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: t.dm, cursor: "pointer", padding: "12px 0", border: `1px solid ${t.ln}`, borderRadius: 12 }}>Skip</div>
    </div>
  </div>
);

// ─── MAIN ───
export default function LiveMatchWireframe() {
const [mode, setMode] = useState(“dark”);
const [screen, setScreen] = useState(“start”);
const [modal, setModal] = useState(null);
const t = THEMES[mode];

const screens = [
{ id: “start”, lb: “1. Start” },
{ id: “setup”, lb: “2. Setup” },
{ id: “live”, lb: “3. Score” },
{ id: “modal-point”, lb: “4. Point Type” },
{ id: “modal-who”, lb: “5. Who Scored” },
];

const handleScreen = (id) => {
if (id === “modal-point”) { setScreen(“live”); setModal(“point”); }
else if (id === “modal-who”) { setScreen(“live”); setModal(“who”); }
else { setScreen(id); setModal(null); }
};

return (
<div style={{
minHeight: “100vh”, background: t.sh,
display: “flex”, flexDirection: “column”, alignItems: “center”,
padding: “24px 16px 48px”,
fontFamily: “‘DM Sans’,-apple-system,sans-serif”,
}}>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

```
  <h2 style={{ color: t.tx, fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Live Match Screens</h2>
  <p style={{ color: t.dm, fontSize: 13, marginBottom: 20, textAlign: "center", maxWidth: 360 }}>
    Full match flow from your current app, restyled
  </p>

  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
    <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")} style={{
      background: t.sf, color: t.tx, border: `1px solid ${t.ln}`,
      borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit",
    }}>{mode === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
  </div>

  <div style={{ display: "flex", gap: 5, marginBottom: 22, flexWrap: "wrap", justifyContent: "center" }}>
    {screens.map(s => {
      const active = (s.id === "modal-point" && modal === "point") ||
                     (s.id === "modal-who" && modal === "who") ||
                     (screen === s.id && !modal);
      return (
        <button key={s.id} onClick={() => handleScreen(s.id)} style={{
          background: active ? t.ac : "transparent",
          color: active ? "#FFF" : t.dm,
          border: `1px solid ${active ? t.ac : t.ln}`,
          borderRadius: 8, padding: "6px 12px", fontSize: 11,
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>{s.lb}</button>
      );
    })}
  </div>

  <Phone t={t}>
    {screen === "start" && <Header title="Start a Game" sub="Spring Cup" t={t} />}
    {screen === "setup" && <Header title="Match Setup" sub="Spring Cup" t={t} />}
    {screen === "live" && <Header title="Alpha vs Bravo" sub="Spring Cup · Set 1" t={t} badge="LIVE" badgeColor={t.ok} />}

    {screen === "start" && <StartGame t={t} />}
    {screen === "setup" && <MatchSetup t={t} />}
    {screen === "live" && <LiveScore t={t} onPoint={() => setModal("point")} />}
    {modal === "point" && <PointTypeModal t={t} onSelect={(n) => setModal(n === "who" ? "who" : null)} />}
    {modal === "who" && <WhoScoredModal t={t} />}
  </Phone>

  <div style={{
    marginTop: 20, maxWidth: 360, textAlign: "center",
    color: t.dm, fontSize: 12, lineHeight: 1.6,
    background: t.sf, borderRadius: 12, padding: "14px 18px",
    border: `1px solid ${t.ln}`,
  }}>
    {{ start: "🏐 Team selectors with player names, set format toggle. Same card and button patterns as all other screens.",
       setup: "📋 Serve order per team, first serve picker, court side, rotation preview. Consistent list items and toggles." }[screen] ||
     (modal === "point" ? "⚡ Bottom sheet: Ace, Spike, Block, Tip, Rival Error. Same card grid and border-radius." :
      modal === "who" ? "👤 Bottom sheet: player selection with avatar initials. Skip option as outline button." :
      "🎮 Dark scoreboard card for contrast. +1 buttons, undo (outline), end (red). Scrollable history list.")}
  </div>
</div>
```

);
}