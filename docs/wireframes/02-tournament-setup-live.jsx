import { useState } from “react”;

const TH = {
dark: {
bg: “#0F1923”, sf: “#1A2734”, alt: “#243447”,
ac: “#F5A623”, acs: “rgba(245,166,35,0.15)”,
tx: “#E8ECF1”, dm: “#7A8EA0”, ok: “#2ECC71”,
ln: “#2A3A4A”, tl: “#00BCD4”, tls: “rgba(0,188,212,0.15)”,
sh: “#080E14”, shadow: “0 24px 64px rgba(0,0,0,0.5)”,
err: “#E74C3C”, errs: “rgba(231,76,60,0.15)”,
},
light: {
bg: “#F5F6F8”, sf: “#FFF”, alt: “#EDF0F4”,
ac: “#E8850C”, acs: “rgba(232,133,12,0.10)”,
tx: “#1A1D23”, dm: “#6B7280”, ok: “#16A34A”,
ln: “#E2E5EB”, tl: “#0891B2”, tls: “rgba(8,145,178,0.08)”,
sh: “#E8EBF0”, shadow: “0 24px 64px rgba(0,0,0,0.08)”,
err: “#DC2626”, errs: “rgba(220,38,38,0.08)”,
},
};

const I = ({ d, s = 20, c }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ic = {
back: c => <I c={c} d={<polyline points="15 18 9 12 15 6"/>}/>,
plus: c => <I c={c} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>,
check: c => <I c={c} d={<polyline points="20 6 9 17 4 12"/>}/>,
shuffle: c => <I c={c} d={<><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></>}/>,
edit: c => <I c={c} d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>}/>,
cal: c => <I c={c} d={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>}/>,
trophy: c => <I c={c} d={<><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></>}/>,
users: c => <I c={c} d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>}/>,
x: c => <I c={c} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>,
arrow: c => <I c={c} s={16} d={<polyline points="9 18 15 12 9 6"/>}/>,
};

const Phone = ({ children, t }) => (

  <div style={{
    width: 320, maxWidth: "100%", height: 660, background: t.bg, borderRadius: 36,
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

// ─── SETUP STEP INDICATOR ───
const Steps = ({ current, t }) => (

  <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 16px", marginBottom: 16 }}>
    {["Players", "Teams", "Schedule"].map((s, i) => (
      <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: i < current ? t.ok : i === current ? t.ac : t.alt,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
            color: i <= current ? "#FFF" : t.dm,
            transition: "all 0.2s",
          }}>
            {i < current ? "✓" : i + 1}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: i === current ? t.ac : i < current ? t.ok : t.dm,
          }}>{s}</span>
        </div>
        {i < 2 && <div style={{ width: 20, height: 2, background: i < current ? t.ok : t.ln, borderRadius: 1, flexShrink: 0 }}/>}
      </div>
    ))}
  </div>
);

// ─── SETUP STEP 1: INVITE PLAYERS ───
const SetupPlayers = ({ t }) => (

  <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
    <div style={{ fontSize: 16, fontWeight: 700, color: t.tx, marginBottom: 4 }}>Invite Players</div>
    <div style={{ fontSize: 12, color: t.dm, marginBottom: 14 }}>Select from your league roster</div>

```
{/* Search */}
<div style={{
  background: t.sf, borderRadius: 10, padding: "10px 14px",
  border: `1px solid ${t.ln}`, marginBottom: 14,
  fontSize: 13, color: t.dm,
}}>🔍 Search players...</div>

{/* Selected */}
<div style={{ fontSize: 11, fontWeight: 700, color: t.ac, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Selected (6)</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
  {["Carlos M.", "Santi", "Diego R.", "Ana P.", "Luis K.", "Maria S."].map(p => (
    <span key={p} style={{
      fontSize: 11, color: t.ac, background: t.acs,
      padding: "5px 10px", borderRadius: 8, fontWeight: 500,
      display: "flex", alignItems: "center", gap: 4,
    }}>
      {p} <span style={{ fontSize: 9, color: t.dm, cursor: "pointer" }}>✕</span>
    </span>
  ))}
</div>

{/* Available */}
<div style={{ fontSize: 11, fontWeight: 700, color: t.dm, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>League Players</div>
{["Pedro L.", "Sofia V.", "Marco T.", "Julia R."].map((p, i) => (
  <div key={i} style={{
    background: t.sf, borderRadius: 10, padding: "10px 14px",
    marginBottom: 6, display: "flex", alignItems: "center", gap: 10,
    border: `1px solid ${t.ln}`, cursor: "pointer",
  }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, background: t.alt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: t.tx }}>{p[0]}</div>
    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.tx }}>{p}</span>
    <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${t.ln}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {ic.plus(t.dm)}
    </div>
  </div>
))}

{/* CTA */}
<div style={{
  marginTop: 14, background: t.ac, borderRadius: 12,
  padding: "13px 0", textAlign: "center", fontSize: 14,
  fontWeight: 700, color: "#FFF", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
}}>
  Next: Create Teams {ic.arrow("#FFF")}
</div>
```

  </div>
);

// ─── SETUP STEP 2: TEAMS ───
const SetupTeams = ({ t }) => {
const [mode, setMode] = useState(“auto”);
return (
<div style={{ flex: 1, padding: “0 16px”, overflowY: “auto” }}>
<div style={{ fontSize: 16, fontWeight: 700, color: t.tx, marginBottom: 4 }}>Create Teams</div>
<div style={{ fontSize: 12, color: t.dm, marginBottom: 14 }}>6 players selected</div>

```
  {/* Toggle */}
  <div style={{ display: "flex", background: t.alt, borderRadius: 10, padding: 3, marginBottom: 16 }}>
    {[{ id: "auto", lb: "Auto Generate", ico: "shuffle" }, { id: "manual", lb: "Manual", ico: "edit" }].map(m => (
      <div key={m.id} onClick={() => setMode(m.id)} style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "9px 0", borderRadius: 8, cursor: "pointer",
        background: mode === m.id ? t.sf : "transparent",
        color: mode === m.id ? t.ac : t.dm,
        fontSize: 12, fontWeight: 600,
        boxShadow: mode === m.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
        transition: "all 0.15s",
      }}>
        {ic[m.ico](mode === m.id ? t.ac : t.dm)}
        {m.lb}
      </div>
    ))}
  </div>

  {mode === "auto" && (
    <>
      <div style={{
        background: t.acs, borderRadius: 10, padding: "10px 14px",
        marginBottom: 14, fontSize: 12, color: t.ac, lineHeight: 1.5,
        border: `1px solid ${t.ac}30`,
      }}>
        💡 Teams will be balanced randomly. Tap shuffle to regenerate.
      </div>

      {/* Generated teams */}
      {[
        { nm: "Team Alpha", p: ["Carlos M.", "Ana P."] },
        { nm: "Team Bravo", p: ["Santi", "Diego R."] },
        { nm: "Team Charlie", p: ["Luis K.", "Maria S."] },
      ].map((team, i) => (
        <div key={i} style={{
          background: t.sf, borderRadius: 12, padding: "12px 14px",
          marginBottom: 8, border: `1px solid ${t.ln}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.tx, marginBottom: 6 }}>{team.nm}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {team.p.map(p => (
              <span key={p} style={{ fontSize: 11, color: t.ac, background: t.acs, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{p}</span>
            ))}
          </div>
        </div>
      ))}

      {/* Shuffle button */}
      <div style={{
        marginTop: 6, border: `1px dashed ${t.ac}50`, borderRadius: 10,
        padding: "10px 0", textAlign: "center", fontSize: 12,
        fontWeight: 600, color: t.ac, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        {ic.shuffle(t.ac)} Shuffle Teams
      </div>
    </>
  )}

  {mode === "manual" && (
    <>
      {[
        { nm: "Team 1", p: ["Carlos M."] },
        { nm: "Team 2", p: [] },
        { nm: "Team 3", p: [] },
      ].map((team, i) => (
        <div key={i} style={{
          background: t.sf, borderRadius: 12, padding: "12px 14px",
          marginBottom: 8, border: `1px solid ${i === 0 ? t.ac + "60" : t.ln}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.tx }}>{team.nm}</span>
            <span style={{ fontSize: 11, color: t.dm }}>{team.p.length}/2</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {team.p.map(p => (
              <span key={p} style={{ fontSize: 11, color: t.ac, background: t.acs, padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{p}</span>
            ))}
            <span style={{
              fontSize: 11, color: t.dm, padding: "3px 8px", borderRadius: 6,
              border: `1px dashed ${t.dm}50`, cursor: "pointer",
            }}>+ Add player</span>
          </div>
        </div>
      ))}

      {/* Unassigned */}
      <div style={{ fontSize: 11, fontWeight: 700, color: t.dm, letterSpacing: 1, textTransform: "uppercase", marginTop: 10, marginBottom: 8 }}>Unassigned (5)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["Santi", "Diego R.", "Ana P.", "Luis K.", "Maria S."].map(p => (
          <span key={p} style={{
            fontSize: 11, color: t.tx, background: t.alt,
            padding: "5px 10px", borderRadius: 8, fontWeight: 500, cursor: "pointer",
          }}>{p}</span>
        ))}
      </div>
    </>
  )}

  {/* CTA */}
  <div style={{
    marginTop: 16, background: t.ac, borderRadius: 12,
    padding: "13px 0", textAlign: "center", fontSize: 14,
    fontWeight: 700, color: "#FFF", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  }}>
    Next: Generate Schedule {ic.arrow("#FFF")}
  </div>
</div>
```

);
};

// ─── SETUP STEP 3: SCHEDULE PREVIEW ───
const SetupSchedule = ({ t }) => (

  <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
    <div style={{ fontSize: 16, fontWeight: 700, color: t.tx, marginBottom: 4 }}>Schedule</div>
    <div style={{ fontSize: 12, color: t.dm, marginBottom: 14 }}>Round-robin · 3 teams · 3 matches</div>

```
{[
  { r: "Round 1", m: "Team Alpha vs Team Bravo" },
  { r: "Round 2", m: "Team Alpha vs Team Charlie" },
  { r: "Round 3", m: "Team Bravo vs Team Charlie" },
].map((g, i) => (
  <div key={i} style={{
    background: t.sf, borderRadius: 12, padding: "12px 14px",
    marginBottom: 8, border: `1px solid ${t.ln}`,
  }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: t.ac, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{g.r}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: t.tx }}>{g.m}</div>
  </div>
))}

<div style={{
  background: t.acs, borderRadius: 10, padding: "10px 14px",
  marginTop: 8, marginBottom: 16, fontSize: 12, color: t.ac, lineHeight: 1.5,
  border: `1px solid ${t.ac}30`,
}}>
  📋 Schedule auto-generated as round-robin. All teams play each other once.
</div>

{/* CTA */}
<div style={{
  marginTop: 4, background: t.ok, borderRadius: 12,
  padding: "13px 0", textAlign: "center", fontSize: 14,
  fontWeight: 700, color: "#FFF", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
}}>
  {ic.check("#FFF")} Start Tournament
</div>
```

  </div>
);

// ─── LIVE VIEW: TAB SWITCHER ───
const PillTabs = ({ items, active, onChange, t }) => (

  <div style={{ display: "flex", background: t.alt, borderRadius: 10, padding: 3, margin: "0 16px 14px" }}>
    {items.map(i => (
      <div key={i.id} onClick={() => onChange(i.id)} style={{
        flex: 1, padding: "8px 0", borderRadius: 8, textAlign: "center",
        fontSize: 11, fontWeight: 600, cursor: "pointer",
        background: active === i.id ? t.sf : "transparent",
        color: active === i.id ? t.ac : t.dm,
        boxShadow: active === i.id ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
        transition: "all 0.15s",
      }}>{i.lb}</div>
    ))}
  </div>
);

// ─── LIVE: STANDINGS ───
const LiveStandings = ({ t }) => (

  <div style={{ padding: "0 16px", overflowY: "auto", flex: 1 }}>
    <div style={{
      background: t.sf, borderRadius: 14, overflow: "hidden",
      border: `1px solid ${t.ln}`,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", padding: "8px 14px",
        borderBottom: `1px solid ${t.ln}`, background: t.alt,
      }}>
        <span style={{ width: 22, fontSize: 10, fontWeight: 700, color: t.dm }}>#</span>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: t.dm }}>TEAM</span>
        <span style={{ width: 28, fontSize: 10, fontWeight: 700, color: t.dm, textAlign: "center" }}>W</span>
        <span style={{ width: 28, fontSize: 10, fontWeight: 700, color: t.dm, textAlign: "center" }}>L</span>
        <span style={{ width: 36, fontSize: 10, fontWeight: 700, color: t.dm, textAlign: "center" }}>PTS</span>
      </div>
      {[
        { nm: "Team Alpha", w: 2, l: 0, pts: 6 },
        { nm: "Team Bravo", w: 1, l: 1, pts: 3 },
        { nm: "Team Charlie", w: 0, l: 2, pts: 0 },
      ].map((team, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", padding: "10px 14px",
          borderBottom: i < 2 ? `1px solid ${t.ln}` : "none",
          background: i === 0 ? t.acs : "transparent",
        }}>
          <span style={{ width: 22, fontSize: 13, fontWeight: 700, color: i === 0 ? t.ac : t.dm }}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.tx }}>{team.nm}</div>
            <div style={{ fontSize: 10, color: t.dm, marginTop: 1 }}>
              {["Carlos M. · Ana P.", "Santi · Diego R.", "Luis K. · Maria S."][i]}
            </div>
          </div>
          <span style={{ width: 28, fontSize: 13, fontWeight: 600, color: t.ok, textAlign: "center" }}>{team.w}</span>
          <span style={{ width: 28, fontSize: 13, fontWeight: 600, color: t.err, textAlign: "center" }}>{team.l}</span>
          <span style={{ width: 36, fontSize: 13, fontWeight: 700, color: t.ac, textAlign: "center" }}>{team.pts}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── LIVE: MATCHES ───
const LiveMatches = ({ t }) => (

  <div style={{ padding: "0 16px", overflowY: "auto", flex: 1 }}>
    {/* Pending */}
    <div style={{ fontSize: 11, fontWeight: 700, color: t.ac, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Pending (1)</div>
    <div style={{
      background: `linear-gradient(135deg,${t.sf},${t.alt})`,
      borderRadius: 12, padding: "12px 14px", marginBottom: 14,
      border: `1px solid ${t.ac}40`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: t.ac, marginBottom: 6 }}>ROUND 3 · UP NEXT</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.tx }}>Team Bravo</div>
          <div style={{ fontSize: 10, color: t.dm }}>1W-1L</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.dm, padding: "3px 8px", background: t.bg, borderRadius: 6 }}>VS</div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.tx }}>Team Charlie</div>
          <div style={{ fontSize: 10, color: t.dm }}>0W-2L</div>
        </div>
      </div>
      <div style={{
        marginTop: 10, background: t.ac, borderRadius: 8,
        padding: "9px 0", textAlign: "center", fontSize: 12,
        fontWeight: 700, color: "#FFF", cursor: "pointer",
      }}>Start Match</div>
    </div>

```
{/* Completed */}
<div style={{ fontSize: 11, fontWeight: 700, color: t.ok, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Completed (2)</div>
{[
  { r: "Round 1", t1: "Team Alpha", s1: 21, t2: "Team Bravo", s2: 18 },
  { r: "Round 2", t1: "Team Alpha", s1: 21, t2: "Team Charlie", s2: 12 },
].map((m, i) => (
  <div key={i} style={{
    background: t.sf, borderRadius: 12, padding: "12px 14px",
    marginBottom: 8, border: `1px solid ${t.ln}`,
  }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: t.dm, letterSpacing: 0.5, marginBottom: 6 }}>{m.r}</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: m.s1 > m.s2 ? t.ok : t.tx, flex: 1 }}>{m.t1}</span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: m.s1 > m.s2 ? t.ok : t.tx }}>{m.s1}</span>
        <span style={{ fontSize: 10, color: t.dm }}>-</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: m.s2 > m.s1 ? t.ok : t.tx }}>{m.s2}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: m.s2 > m.s1 ? t.ok : t.tx, flex: 1, textAlign: "right" }}>{m.t2}</span>
    </div>
  </div>
))}
```

  </div>
);

// ─── LIVE: RESULTS/STATS ───
const LiveResults = ({ t }) => (

  <div style={{ padding: "0 16px", overflowY: "auto", flex: 1 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: t.ac, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Player Stats</div>
    <div style={{
      background: t.sf, borderRadius: 14, overflow: "hidden",
      border: `1px solid ${t.ln}`,
    }}>
      <div style={{ display: "flex", padding: "8px 14px", borderBottom: `1px solid ${t.ln}`, background: t.alt }}>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: t.dm }}>PLAYER</span>
        <span style={{ width: 28, fontSize: 10, fontWeight: 700, color: t.dm, textAlign: "center" }}>W</span>
        <span style={{ width: 28, fontSize: 10, fontWeight: 700, color: t.dm, textAlign: "center" }}>L</span>
        <span style={{ width: 36, fontSize: 10, fontWeight: 700, color: t.dm, textAlign: "center" }}>PTS</span>
      </div>
      {[
        { nm: "Carlos M.", w: 2, l: 0, pts: 6 },
        { nm: "Ana P.", w: 2, l: 0, pts: 6 },
        { nm: "Santi", w: 1, l: 1, pts: 3 },
        { nm: "Diego R.", w: 1, l: 1, pts: 3 },
        { nm: "Luis K.", w: 0, l: 2, pts: 0 },
        { nm: "Maria S.", w: 0, l: 2, pts: 0 },
      ].map((p, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", padding: "9px 14px",
          borderBottom: i < 5 ? `1px solid ${t.ln}` : "none",
        }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: t.tx }}>{p.nm}</span>
          <span style={{ width: 28, fontSize: 12, fontWeight: 600, color: t.ok, textAlign: "center" }}>{p.w}</span>
          <span style={{ width: 28, fontSize: 12, fontWeight: 600, color: t.err, textAlign: "center" }}>{p.l}</span>
          <span style={{ width: 36, fontSize: 12, fontWeight: 700, color: t.ac, textAlign: "center" }}>{p.pts}</span>
        </div>
      ))}
    </div>
    <div style={{
      marginTop: 14, fontSize: 12, color: t.dm, textAlign: "center", lineHeight: 1.5,
    }}>
      Player rankings will update the league standings when the tournament ends.
    </div>
  </div>
);

// ─── LIVE VIEW WRAPPER ───
const LiveView = ({ t }) => {
const [tab, setTab] = useState(“standings”);
return (
<>
<PillTabs
items={[{ id: “standings”, lb: “Standings” }, { id: “matches”, lb: “Matches” }, { id: “results”, lb: “Players” }]}
active={tab} onChange={setTab} t={t}
/>
{{ standings: <LiveStandings t={t} />, matches: <LiveMatches t={t} />, results: <LiveResults t={t} /> }[tab]}
</>
);
};

// ─── MAIN ───
export default function TournamentWireframe() {
const [mode, setMode] = useState(“dark”);
const [view, setView] = useState(“setup”);
const [setupStep, setSetupStep] = useState(0);
const t = TH[mode];

return (
<div style={{
minHeight: “100vh”, background: t.sh,
display: “flex”, flexDirection: “column”, alignItems: “center”,
padding: “24px 16px 48px”,
fontFamily: “‘DM Sans’,-apple-system,sans-serif”,
}}>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

```
  <h2 style={{ color: t.tx, fontSize: 20, fontWeight: 700, marginBottom: 4, letterSpacing: -0.5 }}>Tournament Screens</h2>
  <p style={{ color: t.dm, fontSize: 12, marginBottom: 18, textAlign: "center", maxWidth: 360 }}>
    Setup wizard (3 steps) → Live tournament view (3 tabs)
  </p>

  {/* Controls */}
  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
    <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")} style={{
      background: t.sf, color: t.tx, border: `1px solid ${t.ln}`,
      borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    }}>{mode === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
  </div>

  {/* View toggle */}
  <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" }}>
    {[{ id: "setup", lb: "Setup Wizard" }, { id: "live", lb: "Live Tournament" }].map(v => (
      <button key={v.id} onClick={() => setView(v.id)} style={{
        background: view === v.id ? t.ac : "transparent",
        color: view === v.id ? "#FFF" : t.dm,
        border: `1px solid ${view === v.id ? t.ac : t.ln}`,
        borderRadius: 8, padding: "6px 14px", fontSize: 12,
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}>{v.lb}</button>
    ))}
  </div>

  {/* Setup step selector */}
  {view === "setup" && (
    <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
      {["1. Players", "2. Teams", "3. Schedule"].map((s, i) => (
        <button key={i} onClick={() => setSetupStep(i)} style={{
          background: setupStep === i ? t.ac + "30" : "transparent",
          color: setupStep === i ? t.ac : t.dm,
          border: `1px solid ${setupStep === i ? t.ac + "50" : t.ln}`,
          borderRadius: 6, padding: "4px 10px", fontSize: 10,
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>{s}</button>
      ))}
    </div>
  )}

  {/* Phone */}
  <Phone t={t}>
    {/* Header */}
    <div style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ cursor: "pointer" }}>{ic.back(t.tx)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: t.tx }}>Spring Cup</div>
        <div style={{ fontSize: 11, color: t.dm }}>Miami Beach League</div>
      </div>
      {view === "setup" && (
        <span style={{ fontSize: 10, fontWeight: 700, color: t.ac, background: t.acs, padding: "4px 10px", borderRadius: 8 }}>SETUP</span>
      )}
      {view === "live" && (
        <span style={{ fontSize: 10, fontWeight: 700, color: t.ok, background: `${t.ok}20`, padding: "4px 10px", borderRadius: 8 }}>LIVE</span>
      )}
    </div>

    {/* Steps indicator (setup only) */}
    {view === "setup" && <Steps current={setupStep} t={t} />}

    {/* Content */}
    {view === "setup" && setupStep === 0 && <SetupPlayers t={t} />}
    {view === "setup" && setupStep === 1 && <SetupTeams t={t} />}
    {view === "setup" && setupStep === 2 && <SetupSchedule t={t} />}
    {view === "live" && <LiveView t={t} />}
  </Phone>

  {/* Description */}
  <div style={{
    marginTop: 18, maxWidth: 360, textAlign: "center",
    color: t.dm, fontSize: 11, lineHeight: 1.6,
    background: t.sf, borderRadius: 10, padding: "12px 16px",
    border: `1px solid ${t.ln}`,
  }}>
    {{
      setup: [
        "🏐 Step 1 — Select players from the league roster. Search and tap to add/remove.",
        "👥 Step 2 — Choose auto-generate (random balanced teams with shuffle) or manual assignment (drag players into teams).",
        "📋 Step 3 — Review the auto-generated round-robin schedule. Tap 'Start Tournament' to go live.",
      ][setupStep],
      live: "🏆 Live tournament uses pill tabs to switch between Standings (team rankings table), Matches (pending + completed with scores), and Players (individual stats that feed back to league rankings).",
    }[view]}
  </div>
</div>
```

);
}