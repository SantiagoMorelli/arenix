import { useState } from “react”;

const THEMES = {
dark: {
bg: “#0F1923”, sf: “#1A2734”, alt: “#243447”,
ac: “#F5A623”, acs: “rgba(245,166,35,0.15)”,
tx: “#E8ECF1”, dm: “#7A8EA0”, ok: “#2ECC71”,
ln: “#2A3A4A”, tl: “#00BCD4”, tls: “rgba(0,188,212,0.15)”,
sh: “#080E14”, shadow: “0 24px 64px rgba(0,0,0,0.5)”,
err: “#E74C3C”, errs: “rgba(231,76,60,0.12)”,
},
light: {
bg: “#F5F6F8”, sf: “#FFF”, alt: “#EDF0F4”,
ac: “#E8850C”, acs: “rgba(232,133,12,0.10)”,
tx: “#1A1D23”, dm: “#6B7280”, ok: “#16A34A”,
ln: “#E2E5EB”, tl: “#0891B2”, tls: “rgba(8,145,178,0.08)”,
sh: “#E8EBF0”, shadow: “0 24px 64px rgba(0,0,0,0.08)”,
err: “#DC2626”, errs: “rgba(220,38,38,0.06)”,
},
};

const I = ({ d, s = 20, c }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ic = {
back: c => <I c={c} d={<polyline points="15 18 9 12 15 6"/>}/>,
gear: c => <I c={c} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>}/>,
trophy: c => <I c={c} d={<><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></>}/>,
home: c => <I c={c} d={<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}/>,
star: c => <I c={c} d={<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>}/>,
sun: c => <I c={c} d={<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>}/>,
moon: c => <I c={c} d={<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>}/>,
bell: c => <I c={c} d={<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>}/>,
user: c => <I c={c} d={<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>}/>,
mail: c => <I c={c} d={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></>}/>,
lock: c => <I c={c} d={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>}/>,
log: c => <I c={c} d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>}/>,
trash: c => <I c={c} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>}/>,
arrow: c => <I c={c} s={16} d={<polyline points="9 18 15 12 9 6"/>}/>,
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

const TabBar = ({ active, t }) => (

  <div style={{ display: "flex", borderTop: `1px solid ${t.ln}`, background: t.sf, padding: "6px 0 2px" }}>
    {[{ id: "home", ic: "home", lb: "Home" }, { id: "profile", ic: "star", lb: "Profile" }].map(i => (
      <div key={i.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", padding: "4px 0" }}>
        {ic[i.ic](active === i.id ? t.ac : t.dm)}
        <span style={{ fontSize: 10, fontWeight: 600, color: active === i.id ? t.ac : t.dm }}>{i.lb}</span>
      </div>
    ))}
  </div>
);

const PillTabs = ({ items, active, onChange, t }) => (

  <div style={{ display: "flex", background: t.alt, borderRadius: 10, padding: 3, margin: "0 16px 12px" }}>
    {items.map(i => (
      <div key={i.id} onClick={() => onChange(i.id)} style={{
        flex: 1, padding: "7px 0", borderRadius: 8, textAlign: "center",
        fontSize: 10, fontWeight: 600, cursor: "pointer",
        background: active === i.id ? t.sf : "transparent",
        color: active === i.id ? t.ac : t.dm,
        boxShadow: active === i.id ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
      }}>{i.lb}</div>
    ))}
  </div>
);

const Label = ({ children, color, t, style = {} }) => (

  <div style={{ fontSize: 12, fontWeight: 700, color: color || t.dm, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, ...style }}>{children}</div>
);

// ─── Toggle Switch ───
const Toggle = ({ on, color, t }) => (

  <div style={{
    width: 42, height: 24, borderRadius: 12, padding: 2, cursor: "pointer",
    background: on ? color : t.alt,
    display: "flex", alignItems: on ? "center" : "center",
    justifyContent: on ? "flex-end" : "flex-start",
    transition: "all 0.15s",
  }}>
    <div style={{ width: 20, height: 20, borderRadius: 10, background: "#FFF", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}/>
  </div>
);

// ─── PROFILE: Stats ───
const ProfileStats = ({ t }) => (

  <div style={{ padding: "0 16px", overflowY: "auto", flex: 1 }}>
    {/* Avatar + Name */}
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${t.ac}, ${t.tl})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, fontWeight: 800, color: "#FFF",
      }}>S</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: t.tx }}>Santi</div>
        <div style={{ fontSize: 11, color: t.dm }}>Playing since 2024</div>
      </div>
      <div onClick={() => {}} style={{ cursor: "pointer", padding: 4 }}>{ic.gear(t.dm)}</div>
    </div>

```
{/* Stats grid */}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
  {[
    { n: "47", l: "Matches", c: t.ac },
    { n: "28W", l: "Wins", c: t.ok },
    { n: "60%", l: "Win Rate", c: t.tl },
  ].map(s => (
    <div key={s.l} style={{
      background: t.sf, borderRadius: 12, padding: "12px 8px",
      textAlign: "center", border: `1px solid ${t.ln}`,
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.n}</div>
      <div style={{ fontSize: 9, color: t.dm, marginTop: 2 }}>{s.l}</div>
    </div>
  ))}
</div>

{/* Detailed stats */}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
  {[
    { n: "142", l: "Total Points", emoji: "💥" },
    { n: "38", l: "Aces", emoji: "🎯" },
    { n: "12", l: "Best Streak", emoji: "🔥" },
    { n: "#3", l: "League Rank", emoji: "🏆" },
  ].map(s => (
    <div key={s.l} style={{
      background: t.sf, borderRadius: 12, padding: "10px 12px",
      border: `1px solid ${t.ln}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>{s.emoji}</span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.tx }}>{s.n}</div>
        <div style={{ fontSize: 9, color: t.dm }}>{s.l}</div>
      </div>
    </div>
  ))}
</div>
```

  </div>
);

// ─── PROFILE: Leagues ───
const ProfileLeagues = ({ t }) => (

  <div style={{ padding: "0 16px", overflowY: "auto", flex: 1 }}>
    <Label color={t.ac} t={t}>My Leagues</Label>
    {[
      { nm: "Miami Beach League", role: "Player", rank: "#3", players: 24, season: "2026" },
      { nm: "South Beach Open", role: "Admin", rank: "#1", players: 16, season: "2025" },
    ].map((lg, i) => (
      <div key={i} style={{
        background: t.sf, borderRadius: 12, padding: "12px 14px",
        border: `1px solid ${t.ln}`, marginBottom: 8, cursor: "pointer",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.tx }}>{lg.nm}</div>
            <div style={{ fontSize: 11, color: t.dm }}>Season {lg.season} · {lg.players} players</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: t.ac,
              background: t.acs, padding: "3px 8px", borderRadius: 6,
            }}>{lg.rank}</span>
            {lg.role === "Admin" && <span style={{
              fontSize: 9, fontWeight: 700, color: t.tl,
              background: t.tls, padding: "3px 8px", borderRadius: 6,
            }}>Admin</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { n: i === 0 ? "8W" : "12W", l: "Wins" },
            { n: i === 0 ? "4L" : "2L", l: "Losses" },
            { n: i === 0 ? "3" : "5", l: "Tournaments" },
          ].map(s => (
            <div key={s.l} style={{
              flex: 1, background: t.bg, borderRadius: 8, padding: "6px 4px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.tx }}>{s.n}</div>
              <div style={{ fontSize: 8, color: t.dm }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    ))}

```
<div style={{
  border: `1px dashed ${t.ac}50`, borderRadius: 12, padding: "14px 0",
  textAlign: "center", fontSize: 12, fontWeight: 600, color: t.ac,
  cursor: "pointer", marginTop: 4,
}}>+ Join a League</div>
```

  </div>
);

// ─── PROFILE: Match History ───
const ProfileHistory = ({ t }) => (

  <div style={{ padding: "0 16px", overflowY: "auto", flex: 1 }}>
    <Label color={t.dm} t={t}>Recent Matches</Label>
    {[
      { date: "Apr 12", tourn: "Spring Cup", t1: "Alpha", t2: "Bravo", s1: 21, s2: 18, won: true, type: "Tournament" },
      { date: "Apr 10", tourn: "Free Play", t1: "Santi & Marco", t2: "Julia & Alex", s1: 15, s2: 21, won: false, type: "Free Play" },
      { date: "Apr 8", tourn: "Spring Cup", t1: "Alpha", t2: "Charlie", s1: 21, s2: 12, won: true, type: "Tournament" },
      { date: "Apr 5", tourn: "Free Play", t1: "Santi & Ana", t2: "Diego & Luis", s1: 21, s2: 19, won: true, type: "Free Play" },
      { date: "Apr 2", tourn: "Winter Clash", t1: "Bravo", t2: "Delta", s1: 18, s2: 21, won: false, type: "Tournament" },
    ].map((m, i) => (
      <div key={i} style={{
        background: t.sf, borderRadius: 12, padding: "10px 14px",
        border: `1px solid ${t.ln}`, marginBottom: 6, cursor: "pointer",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: t.dm }}>{m.date}</span>
            <span style={{
              fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
              color: m.type === "Tournament" ? t.ac : t.tl,
              background: m.type === "Tournament" ? t.acs : t.tls,
            }}>{m.tourn}</span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: m.won ? t.ok : t.err,
          }}>{m.won ? "WIN" : "LOSS"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.tx, flex: 1 }}>{m.t1}</span>
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: m.s1 > m.s2 ? t.ok : t.tx }}>{m.s1}</span>
            <span style={{ fontSize: 10, color: t.dm }}>-</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: m.s2 > m.s1 ? t.ok : t.tx }}>{m.s2}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.tx, flex: 1, textAlign: "right" }}>{m.t2}</span>
        </div>
      </div>
    ))}
  </div>
);

// ─── SETTINGS SCREEN ───
const SettingsScreen = ({ t, mode }) => {
const SettingsRow = ({ icon, label, right, border = true }) => (
<div style={{
display: “flex”, alignItems: “center”, gap: 12, padding: “12px 0”,
borderBottom: border ? `1px solid ${t.ln}` : “none”,
}}>
<div style={{
width: 34, height: 34, borderRadius: 10, background: t.alt,
display: “flex”, alignItems: “center”, justifyContent: “center”,
}}>{icon}</div>
<span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.tx }}>{label}</span>
{right}
</div>
);

return (
<div style={{ flex: 1, padding: “0 16px”, overflowY: “auto” }}>
{/* Theme */}
<Label color={t.ac} t={t}>Appearance</Label>
<div style={{
background: t.sf, borderRadius: 12, padding: “4px 14px”,
border: `1px solid ${t.ln}`, marginBottom: 16,
}}>
<SettingsRow
icon={mode === “dark” ? ic.moon(t.ac) : ic.sun(t.ac)}
label=“Dark Mode”
right={<Toggle on={mode === “dark”} color={t.ac} t={t} />}
border={false}
/>
</div>

```
  {/* Notifications */}
  <Label color={t.ac} t={t}>Notifications</Label>
  <div style={{
    background: t.sf, borderRadius: 12, padding: "4px 14px",
    border: `1px solid ${t.ln}`, marginBottom: 16,
  }}>
    <SettingsRow
      icon={ic.bell(t.tl)}
      label="Match Reminders"
      right={<Toggle on={true} color={t.tl} t={t} />}
    />
    <SettingsRow
      icon={ic.trophy(t.tl)}
      label="Tournament Updates"
      right={<Toggle on={true} color={t.tl} t={t} />}
    />
    <SettingsRow
      icon={ic.star(t.tl)}
      label="League Invites"
      right={<Toggle on={false} color={t.tl} t={t} />}
      border={false}
    />
  </div>

  {/* Account */}
  <Label color={t.ac} t={t}>Account</Label>
  <div style={{
    background: t.sf, borderRadius: 12, padding: "4px 14px",
    border: `1px solid ${t.ln}`, marginBottom: 16,
  }}>
    <SettingsRow
      icon={ic.user(t.dm)}
      label="Edit Profile"
      right={ic.arrow(t.dm)}
    />
    <SettingsRow
      icon={ic.mail(t.dm)}
      label="Email"
      right={<span style={{ fontSize: 11, color: t.dm }}>santi@mail.com</span>}
    />
    <SettingsRow
      icon={ic.lock(t.dm)}
      label="Change Password"
      right={ic.arrow(t.dm)}
      border={false}
    />
  </div>

  {/* Danger zone */}
  <div style={{
    background: t.sf, borderRadius: 12, padding: "4px 14px",
    border: `1px solid ${t.ln}`, marginBottom: 12,
  }}>
    <SettingsRow
      icon={ic.log(t.err)}
      label="Log Out"
      right={ic.arrow(t.err)}
    />
    <SettingsRow
      icon={ic.trash(t.err)}
      label="Delete Account"
      right={ic.arrow(t.err)}
      border={false}
    />
  </div>
</div>
```

);
};

// ─── MAIN ───
export default function ProfileSettingsWireframe() {
const [mode, setMode] = useState(“dark”);
const [screen, setScreen] = useState(“profile”);
const [profileTab, setProfileTab] = useState(“stats”);
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
  <h2 style={{ color: t.tx, fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Profile & Settings</h2>
  <p style={{ color: t.dm, fontSize: 13, marginBottom: 20, textAlign: "center", maxWidth: 360 }}>
    Accessible from the Home bottom nav and gear icon
  </p>

  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
    <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")} style={{
      background: t.sf, color: t.tx, border: `1px solid ${t.ln}`,
      borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit",
    }}>{mode === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
  </div>

  <div style={{ display: "flex", gap: 5, marginBottom: 22, flexWrap: "wrap", justifyContent: "center" }}>
    {[{ id: "profile", lb: "Profile" }, { id: "settings", lb: "Settings" }].map(s => (
      <button key={s.id} onClick={() => setScreen(s.id)} style={{
        background: screen === s.id ? t.ac : "transparent",
        color: screen === s.id ? "#FFF" : t.dm,
        border: `1px solid ${screen === s.id ? t.ac : t.ln}`,
        borderRadius: 8, padding: "6px 12px", fontSize: 11,
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}>{s.lb}</button>
    ))}
  </div>

  <Phone t={t}>
    {/* Profile Screen */}
    {screen === "profile" && (
      <>
        <div style={{ padding: "10px 16px 8px" }}>
          <div style={{ fontSize: 11, color: t.dm, marginBottom: 2 }}>My Profile</div>
        </div>
        <ProfileStats t={t} />
        <PillTabs
          items={[
            { id: "stats", lb: "Stats" },
            { id: "leagues", lb: "Leagues" },
            { id: "history", lb: "Matches" },
          ]}
          active={profileTab} onChange={setProfileTab} t={t}
        />
        {/* Swap content below tabs with a second scroll area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {profileTab === "stats" && (
            <div style={{ padding: "0 16px", overflowY: "auto", flex: 1 }}>
              {/* Extra stats below the grid */}
              <Label color={t.dm} t={t}>Performance</Label>
              <div style={{ background: t.sf, borderRadius: 12, padding: "10px 14px", border: `1px solid ${t.ln}`, marginBottom: 8 }}>
                {[
                  { l: "Points per Match", v: "8.2 avg" },
                  { l: "Aces per Match", v: "2.1 avg" },
                  { l: "Serve Win %", v: "58%" },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", padding: "7px 0",
                    borderBottom: i < 2 ? `1px solid ${t.ln}` : "none",
                  }}>
                    <span style={{ fontSize: 12, color: t.tx }}>{s.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.ac }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {profileTab === "leagues" && <ProfileLeagues t={t} />}
          {profileTab === "history" && <ProfileHistory t={t} />}
        </div>
        <TabBar active="profile" t={t} />
      </>
    )}

    {/* Settings Screen */}
    {screen === "settings" && (
      <>
        <div style={{ padding: "10px 16px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ cursor: "pointer", padding: 4 }}>{ic.back(t.tx)}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.tx }}>Settings</div>
        </div>
        <SettingsScreen t={t} mode={mode} />
      </>
    )}
  </Phone>

  <div style={{
    marginTop: 20, maxWidth: 360, textAlign: "center",
    color: t.dm, fontSize: 12, lineHeight: 1.6,
    background: t.sf, borderRadius: 12, padding: "14px 18px",
    border: `1px solid ${t.ln}`,
  }}>
    {screen === "profile" ? {
      stats: "⭐ Profile Stats — avatar, name, key stats grid (matches, wins, win rate), detailed stats (total points, aces, streak, rank), plus performance averages.",
      leagues: "🏆 Leagues — all leagues you belong to with your rank, role (admin badge), W/L record, and tournament count per league. Option to join new leagues.",
      history: "📋 Match History — chronological list of all matches with date, tournament/free play badge, teams, score, and WIN/LOSS indicator. Tap to see full match result.",
    }[profileTab] : "⚙️ Settings — Dark mode toggle, notification controls (match reminders, tournament updates, league invites), account management (edit profile, email, password), and danger zone (log out, delete account)."}
  </div>
</div>
```

);
}