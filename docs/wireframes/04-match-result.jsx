import { useState } from “react”;

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

const I = ({ d, s = 20, c }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ic = {
back: c => <I c={c} d={<polyline points="15 18 9 12 15 6"/>}/>,
trophy: c => <I c={c} d={<><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></>}/>,
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>{children}</div>
    <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 120, height: 4, background: t.alt, borderRadius: 2 }}/>
    </div>
  </div>
);

const Header = ({ t }) => (

  <div style={{ padding: "10px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ cursor: "pointer", padding: 4 }}>{ic.back(t.tx)}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: t.tx }}>Match Result</div>
      <div style={{ fontSize: 11, color: t.dm }}>Spring Cup · Round 1</div>
    </div>
    <span style={{ fontSize: 10, fontWeight: 700, color: t.dm, background: t.alt, padding: "4px 10px", borderRadius: 8 }}>FINAL</span>
  </div>
);

const Label = ({ children, color, t, style = {} }) => (

  <div style={{ fontSize: 12, fontWeight: 700, color: color || t.dm, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, ...style }}>{children}</div>
);

// Bar for comparison stats
const StatBar = ({ label, a, b, t, aColor, bColor }) => {
const total = a + b || 1;
return (
<div style={{ marginBottom: 8 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, marginBottom: 3 }}>
<span style={{ fontSize: 11, fontWeight: 700, color: aColor || t.ac }}>{a}</span>
<span style={{ fontSize: 10, fontWeight: 600, color: t.dm }}>{label}</span>
<span style={{ fontSize: 11, fontWeight: 700, color: bColor || t.tl }}>{b}</span>
</div>
<div style={{ display: “flex”, height: 6, borderRadius: 3, overflow: “hidden”, background: t.alt }}>
<div style={{ width: `${(a / total) * 100}%`, background: aColor || t.ac, borderRadius: “3px 0 0 3px” }}/>
<div style={{ width: `${(b / total) * 100}%`, background: bColor || t.tl, borderRadius: “0 3px 3px 0” }}/>
</div>
</div>
);
};

// ─── SECTIONS ───

const WinnerSection = ({ t }) => (

  <div style={{
    background: t.scoreBg, borderRadius: 16, padding: "16px 16px 14px",
    marginBottom: 12, textAlign: "center",
  }}>
    <div style={{ marginBottom: 8 }}>{ic.trophy("#F5A623")}</div>
    <div style={{ fontSize: 10, fontWeight: 700, color: "#7A8EA0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Winner</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: "#F5A623", marginBottom: 8 }}>Team Alpha</div>
    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 6 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#7A8EA0", marginBottom: 2 }}>Sets</div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#F5A623" }}>2</span>
          <span style={{ fontSize: 12, color: "#7A8EA0" }}>-</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#7A8EA0" }}>1</span>
        </div>
      </div>
    </div>
    {/* Per-set scores */}
    <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
      {[{ s1: 21, s2: 18, w: "a" }, { s1: 15, s2: 21, w: "b" }, { s1: 15, s2: 11, w: "a" }].map((set, i) => (
        <div key={i} style={{
          background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "5px 10px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 9, color: "#7A8EA0", marginBottom: 2 }}>Set {i + 1}</div>
          <div style={{ display: "flex", gap: 3, alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: set.w === "a" ? "#F5A623" : "#7A8EA0" }}>{set.s1}</span>
            <span style={{ fontSize: 9, color: "#7A8EA0" }}>-</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: set.w === "b" ? "#00BCD4" : "#7A8EA0" }}>{set.s2}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TotalPoints = ({ t }) => (

  <div style={{ background: t.sf, borderRadius: 12, padding: "12px 14px", border: `1px solid ${t.ln}`, marginBottom: 12 }}>
    <Label color={t.ac} t={t} style={{ marginBottom: 6 }}>Total Points</Label>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <div style={{ textAlign: "center", flex: 1 }}>
        <div style={{ fontSize: 10, color: t.dm }}>Alpha</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: t.ac }}>51</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, color: t.dm }}>Total</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.dm }}>101</div>
      </div>
      <div style={{ textAlign: "center", flex: 1 }}>
        <div style={{ fontSize: 10, color: t.dm }}>Bravo</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: t.tl }}>50</div>
      </div>
    </div>
  </div>
);

const PointsByType = ({ t }) => (

  <div style={{ background: t.sf, borderRadius: 12, padding: "12px 14px", border: `1px solid ${t.ln}`, marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: t.ac }}>Alpha</span>
      <Label color={t.dm} t={t} style={{ marginBottom: 0 }}>Points by Type</Label>
      <span style={{ fontSize: 10, fontWeight: 700, color: t.tl }}>Bravo</span>
    </div>
    <StatBar label="🎯 Ace" a={8} b={5} t={t} />
    <StatBar label="💥 Spike" a={18} b={20} t={t} />
    <StatBar label="🛡️ Block" a={7} b={6} t={t} />
    <StatBar label="🤏 Tip" a={4} b={3} t={t} />
    <StatBar label="❌ Rival Err" a={14} b={16} t={t} />
  </div>
);

const ServeEfficiency = ({ t }) => (

  <div style={{ background: t.sf, borderRadius: 12, padding: "12px 14px", border: `1px solid ${t.ln}`, marginBottom: 12 }}>
    <Label color={t.dm} t={t}>Serve Efficiency</Label>
    <div style={{ display: "flex", gap: 8 }}>
      {[
        { nm: "Alpha", c: t.ac, cs: t.acs, srv: 28, rcv: 23, pct: "55%" },
        { nm: "Bravo", c: t.tl, cs: t.tls, srv: 24, rcv: 26, pct: "48%" },
      ].map(tm => (
        <div key={tm.nm} style={{ flex: 1, background: tm.cs, borderRadius: 10, padding: "10px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: tm.c, marginBottom: 6 }}>{tm.nm}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: tm.c, marginBottom: 4 }}>{tm.pct}</div>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.tx }}>{tm.srv}</div>
              <div style={{ fontSize: 8, color: t.dm, textTransform: "uppercase" }}>Serving</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.tx }}>{tm.rcv}</div>
              <div style={{ fontSize: 8, color: t.dm, textTransform: "uppercase" }}>Receiving</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StreaksPlayers = ({ t }) => (

  <div style={{ background: t.sf, borderRadius: 12, padding: "12px 14px", border: `1px solid ${t.ln}`, marginBottom: 12 }}>
    <Label color={t.dm} t={t}>Streaks & Players</Label>
    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      {[
        { nm: "Alpha", c: t.ac, cs: t.acs, streak: 6 },
        { nm: "Bravo", c: t.tl, cs: t.tls, streak: 4 },
      ].map(tm => (
        <div key={tm.nm} style={{
          flex: 1, background: tm.cs, borderRadius: 8, padding: "8px 10px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: tm.c }}>{tm.nm}</div>
            <div style={{ fontSize: 9, color: t.dm }}>Best streak</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: tm.c }}>{tm.streak}</div>
        </div>
      ))}
    </div>

```
{/* Players table */}
<div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${t.ln}` }}>
  <div style={{ display: "flex", padding: "6px 10px", background: t.alt }}>
    <span style={{ flex: 1, fontSize: 9, fontWeight: 700, color: t.dm }}>PLAYER</span>
    <span style={{ width: 40, fontSize: 9, fontWeight: 700, color: t.dm, textAlign: "center" }}>PTS</span>
    <span style={{ width: 32, fontSize: 9, fontWeight: 700, color: t.dm, textAlign: "center" }}>ACE</span>
    <span style={{ width: 32, fontSize: 9, fontWeight: 700, color: t.dm, textAlign: "center" }}>SPK</span>
    <span style={{ width: 32, fontSize: 9, fontWeight: 700, color: t.dm, textAlign: "center" }}>BLK</span>
  </div>
  {[
    { n: "Carlos M.", pts: 18, ace: 5, spk: 8, blk: 3, c: t.ac },
    { n: "Ana P.", pts: 14, ace: 3, spk: 6, blk: 4, c: t.ac },
    { n: "Santi", pts: 16, ace: 3, spk: 9, blk: 2, c: t.tl },
    { n: "Diego R.", pts: 12, ace: 2, spk: 5, blk: 4, c: t.tl },
  ].map((p, i) => (
    <div key={i} style={{
      display: "flex", alignItems: "center", padding: "7px 10px",
      borderBottom: i < 3 ? `1px solid ${t.ln}` : "none",
    }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.c }}/>
        <span style={{ fontSize: 11, fontWeight: 500, color: t.tx }}>{p.n}</span>
      </div>
      <span style={{ width: 40, fontSize: 12, fontWeight: 700, color: t.tx, textAlign: "center" }}>{p.pts}</span>
      <span style={{ width: 32, fontSize: 11, color: t.dm, textAlign: "center" }}>{p.ace}</span>
      <span style={{ width: 32, fontSize: 11, color: t.dm, textAlign: "center" }}>{p.spk}</span>
      <span style={{ width: 32, fontSize: 11, color: t.dm, textAlign: "center" }}>{p.blk}</span>
    </div>
  ))}
</div>
```

  </div>
);

const MatchHistory = ({ t }) => (

  <div style={{ background: t.sf, borderRadius: 12, overflow: "hidden", border: `1px solid ${t.ln}`, marginBottom: 12 }}>
    <div style={{ padding: "10px 14px", background: t.alt, fontSize: 12, fontWeight: 700, color: t.ac, letterSpacing: 1, textTransform: "uppercase" }}>Match History</div>
    {[
      { s: "15-11", ev: "Ace by Carlos M.", srv: "Carlos M.", tm: "Alpha", tc: t.ac },
      { s: "14-11", ev: "Spike by Ana P.", srv: "Ana P.", tm: "Alpha", tc: t.ac },
      { s: "13-11", ev: "Rival error", srv: "Santi", tm: "Alpha", tc: t.ac },
      { s: "12-11", ev: "Block by Santi", srv: "Santi", tm: "Bravo", tc: t.tl },
      { s: "12-10", ev: "Tip by Diego R.", srv: "Diego R.", tm: "Bravo", tc: t.tl },
      { s: "12-9", ev: "Spike by Carlos M.", srv: "Ana P.", tm: "Alpha", tc: t.ac },
    ].map((h, i) => (
      <div key={i} style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: i < 5 ? `1px solid ${t.ln}` : "none" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.ac, width: 36 }}>{h.s}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: t.tx }}>{h.ev}</div>
          <div style={{ fontSize: 9, color: t.dm }}>🏐 {h.srv}</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 600, color: h.tc, background: h.tm === "Alpha" ? t.acs : t.tls, padding: "2px 6px", borderRadius: 4 }}>{h.tm}</span>
      </div>
    ))}
  </div>
);

// ─── PILL TABS for sections ───
const PillTabs = ({ items, active, onChange, t }) => (

  <div style={{ display: "flex", background: t.alt, borderRadius: 10, padding: 3, margin: "0 16px 12px" }}>
    {items.map(i => (
      <div key={i.id} onClick={() => onChange(i.id)} style={{
        flex: 1, padding: "7px 0", borderRadius: 8, textAlign: "center",
        fontSize: 10, fontWeight: 600, cursor: "pointer",
        background: active === i.id ? t.sf : "transparent",
        color: active === i.id ? t.ac : t.dm,
        boxShadow: active === i.id ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
        transition: "all 0.15s",
      }}>{i.lb}</div>
    ))}
  </div>
);

// ─── MAIN ───
export default function MatchResultWireframe() {
const [mode, setMode] = useState(“dark”);
const [tab, setTab] = useState(“overview”);
const t = THEMES[mode];

return (
<div style={{
minHeight: “100vh”, background: t.sh,
display: “flex”, flexDirection: “column”, alignItems: “center”,
padding: “24px 16px 48px”,
fontFamily: “‘DM Sans’,-apple-system,sans-serif”,
}}>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

```
  <h2 style={{ color: t.tx, fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Match Result Screen</h2>
  <p style={{ color: t.dm, fontSize: 13, marginBottom: 20, textAlign: "center", maxWidth: 360 }}>
    Stats shown after match ends or when tapping a completed match
  </p>

  <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
    <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")} style={{
      background: t.sf, color: t.tx, border: `1px solid ${t.ln}`,
      borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit",
    }}>{mode === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
  </div>

  <Phone t={t}>
    <Header t={t} />
    <PillTabs
      items={[
        { id: "overview", lb: "Overview" },
        { id: "stats", lb: "Stats" },
        { id: "history", lb: "History" },
      ]}
      active={tab} onChange={setTab} t={t}
    />
    <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
      {tab === "overview" && (
        <>
          <WinnerSection t={t} />
          <TotalPoints t={t} />
          <StreaksPlayers t={t} />
        </>
      )}
      {tab === "stats" && (
        <>
          <PointsByType t={t} />
          <ServeEfficiency t={t} />
        </>
      )}
      {tab === "history" && (
        <MatchHistory t={t} />
      )}
    </div>
  </Phone>

  <div style={{
    marginTop: 20, maxWidth: 360, textAlign: "center",
    color: t.dm, fontSize: 12, lineHeight: 1.6,
    background: t.sf, borderRadius: 12, padding: "14px 18px",
    border: `1px solid ${t.ln}`,
  }}>
    {{
      overview: "🏆 Overview — Winner banner with sets + per-set scores, total points comparison, best streaks per team, and individual player stats table.",
      stats: "📊 Stats — Points broken down by type (Ace, Spike, Block, Tip, Rival Error) with comparison bars, plus serve efficiency showing points won serving vs receiving.",
      history: "📋 History — Full point-by-point log with score, play description, who was serving, and which team scored.",
    }[tab]}
  </div>
</div>
```

);
}