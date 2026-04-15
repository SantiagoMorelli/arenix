import { useState } from “react”;

const THEMES = {
dark: {
bg: “#0F1923”, sf: “#1A2734”, alt: “#243447”,
ac: “#F5A623”, acs: “rgba(245,166,35,0.15)”,
tx: “#E8ECF1”, dm: “#7A8EA0”, ok: “#2ECC71”,
ln: “#2A3A4A”, tl: “#00BCD4”, tls: “rgba(0,188,212,0.15)”,
sh: “#080E14”, shadow: “0 24px 64px rgba(0,0,0,0.5)”,
err: “#E74C3C”,
},
light: {
bg: “#F5F6F8”, sf: “#FFF”, alt: “#EDF0F4”,
ac: “#E8850C”, acs: “rgba(232,133,12,0.10)”,
tx: “#1A1D23”, dm: “#6B7280”, ok: “#16A34A”,
ln: “#E2E5EB”, tl: “#0891B2”, tls: “rgba(8,145,178,0.08)”,
sh: “#E8EBF0”, shadow: “0 24px 64px rgba(0,0,0,0.08)”,
err: “#DC2626”,
},
};

const I = ({ d, s = 20, c }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ic = {
bell: c => <I c={c} d={<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>}/>,
gear: c => <I c={c} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>}/>,
home: c => <I c={c} d={<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}/>,
star: c => <I c={c} d={<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>}/>,
trophy: c => <I c={c} d={<><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></>}/>,
play: c => <I c={c} d={<><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill={c}/></>}/>,
plus: c => <I c={c} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>,
ball: c => <I c={c} d={<><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20"/><path d="M2 12a14.5 14.5 0 0120 0"/></>}/>,
users: c => <I c={c} d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>}/>,
chart: c => <I c={c} d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}/>,
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

const TabBar = ({ t }) => (

  <div style={{ display: "flex", borderTop: `1px solid ${t.ln}`, background: t.sf, padding: "6px 0 2px" }}>
    {[{ id: "home", ic: "home", lb: "Home" }, { id: "profile", ic: "star", lb: "Profile" }].map(i => (
      <div key={i.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", padding: "4px 0" }}>
        {ic[i.ic](i.id === "home" ? t.ac : t.dm)}
        <span style={{ fontSize: 10, fontWeight: 600, color: i.id === "home" ? t.ac : t.dm }}>{i.lb}</span>
      </div>
    ))}
  </div>
);

// ─── NOTIFICATION PANEL ───
const NotificationPanel = ({ t, onClose }) => {
const notifs = [
{ type: “match”, emoji: “🏐”, title: “Match starting soon”, desc: “Alpha vs Bravo · Spring Cup”, time: “5 min ago”, color: t.ac, unread: true },
{ type: “result”, emoji: “🏆”, title: “Tournament result”, desc: “You won Spring Cup Round 1!”, time: “2h ago”, color: t.ok, unread: true },
{ type: “invite”, emoji: “🤝”, title: “League invite”, desc: “Carlos invited you to South Beach Open”, time: “5h ago”, color: t.tl, unread: true },
{ type: “rank”, emoji: “📈”, title: “Ranking update”, desc: “You moved up to #3 in Miami Beach League”, time: “1d ago”, color: t.ac, unread: false },
{ type: “match”, emoji: “📋”, title: “New match scheduled”, desc: “Alpha vs Charlie · Tomorrow 4 PM”, time: “1d ago”, color: t.dm, unread: false },
];

return (
<div style={{ position: “absolute”, inset: 0, zIndex: 20, display: “flex”, flexDirection: “column” }}>
{/* Backdrop */}
<div onClick={onClose} style={{ position: “absolute”, inset: 0, background: “rgba(0,0,0,0.35)” }}/>

```
  {/* Panel — drops from top */}
  <div style={{
    position: "relative", zIndex: 2,
    background: t.bg, borderRadius: "0 0 20px 20px",
    padding: "0 0 12px", maxHeight: "85%", display: "flex", flexDirection: "column",
    boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
  }}>
    {/* Header */}
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 16px 10px",
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: t.tx }}>Notifications</div>
      <span style={{ fontSize: 11, fontWeight: 600, color: t.ac, cursor: "pointer" }}>Mark all read</span>
    </div>

    {/* List */}
    <div style={{ overflowY: "auto", flex: 1, padding: "0 12px" }}>
      {notifs.map((n, i) => (
        <div key={i} style={{
          display: "flex", gap: 10, padding: "10px 8px",
          borderRadius: 10, marginBottom: 2, cursor: "pointer",
          background: n.unread ? t.acs : "transparent",
        }}>
          {/* Icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${n.color}15`, border: `1px solid ${n.color}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>{n.emoji}</div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: n.unread ? 700 : 500, color: t.tx }}>{n.title}</div>
              {n.unread && <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.ac, flexShrink: 0, marginTop: 4 }}/>}
            </div>
            <div style={{ fontSize: 11, color: t.dm, marginTop: 1 }}>{n.desc}</div>
            <div style={{ fontSize: 9, color: t.dm, marginTop: 3 }}>{n.time}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Handle */}
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
      <div style={{ width: 36, height: 4, background: t.alt, borderRadius: 2 }}/>
    </div>
  </div>
</div>
```

);
};

// ─── HOME SCREEN (with bell + gear in header) ───
const HomeContent = ({ t, onBell }) => (

  <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
    {/* Header */}
    <div style={{ padding: "12px 0 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 13, color: t.dm, fontWeight: 500 }}>Welcome back</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.tx }}>Santi 🏐</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {/* Bell with badge */}
        <div onClick={onBell} style={{
          width: 38, height: 38, borderRadius: 12, background: t.alt,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", cursor: "pointer",
        }}>
          {ic.bell(t.dm)}
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 16, height: 16, borderRadius: "50%",
            background: t.err, border: `2px solid ${t.bg}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, fontWeight: 800, color: "#FFF",
          }}>3</div>
        </div>
        {/* Gear */}
        <div style={{
          width: 38, height: 38, borderRadius: 12, background: t.alt,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          {ic.gear(t.dm)}
        </div>
      </div>
    </div>

```
{/* League Card */}
<div style={{
  background: `linear-gradient(135deg, ${t.sf}, ${t.alt})`,
  borderRadius: 16, padding: 18, marginBottom: 14,
  border: `1px solid ${t.ac}40`,
}}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
    <div>
      <div style={{ fontSize: 10, color: t.ac, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>My League</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: t.tx }}>Miami Beach League</div>
      <div style={{ fontSize: 12, color: t.dm, marginTop: 2 }}>Season 2026 · 24 players</div>
    </div>
    <div style={{ background: t.acs, borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, color: t.ac }}>#3 Rank</div>
  </div>
  <div style={{ display: "flex", gap: 8 }}>
    {[{ n: "3", l: "Tournaments" }, { n: "12", l: "Matches" }, { n: "8W-4L", l: "Record" }].map(s => (
      <div key={s.l} style={{ flex: 1, background: t.bg, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.tx }}>{s.n}</div>
        <div style={{ fontSize: 9, color: t.dm, marginTop: 1 }}>{s.l}</div>
      </div>
    ))}
  </div>
</div>

{/* Free Play */}
<div style={{
  background: `linear-gradient(135deg, ${t.tls}, ${t.sf})`,
  borderRadius: 16, padding: 16, marginBottom: 18,
  border: `1px solid ${t.tl}30`,
  display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
}}>
  <div style={{ width: 48, height: 48, borderRadius: 14, background: t.tls, display: "flex", alignItems: "center", justifyContent: "center" }}>{ic.play(t.tl)}</div>
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: t.tx }}>Free Play</div>
    <div style={{ fontSize: 11, color: t.dm }}>Quick match · Any players · No league</div>
  </div>
  {ic.plus(t.tl)}
</div>

{/* Recent */}
<div style={{ fontSize: 12, fontWeight: 700, color: t.dm, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Recent</div>
{[
  { title: "Spring Cup", sub: "Tournament · Final round", badge: "LIVE", bc: t.ok, icn: "trophy", bgC: t.acs, icC: t.ac },
  { title: "Free Play", sub: "Yesterday · 4 players", badge: "Done", bc: t.dm, icn: "ball", bgC: t.tls, icC: t.tl },
].map((a, i) => (
  <div key={i} style={{
    background: t.sf, borderRadius: 12, padding: "12px 14px",
    marginBottom: 8, display: "flex", alignItems: "center", gap: 12,
    border: `1px solid ${t.ln}`,
  }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: a.bgC, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {ic[a.icn](a.icC)}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.tx }}>{a.title}</div>
      <div style={{ fontSize: 11, color: t.dm }}>{a.sub}</div>
    </div>
    <span style={{ fontSize: 10, fontWeight: 700, color: a.bc, background: `${a.bc}20`, padding: "3px 8px", borderRadius: 6 }}>{a.badge}</span>
  </div>
))}
```

  </div>
);

// ─── MAIN ───
export default function NotificationsWireframe() {
const [mode, setMode] = useState(“dark”);
const [showNotifs, setShowNotifs] = useState(false);
const [view, setView] = useState(“closed”);
const t = THEMES[mode];

const handleView = (v) => {
setView(v);
setShowNotifs(v === “open”);
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
  <h2 style={{ color: t.tx, fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: -0.5 }}>Home + Notifications</h2>
  <p style={{ color: t.dm, fontSize: 13, marginBottom: 20, textAlign: "center", maxWidth: 360 }}>
    Bell icon in header with dropdown notification panel
  </p>

  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
    <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")} style={{
      background: t.sf, color: t.tx, border: `1px solid ${t.ln}`,
      borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit",
    }}>{mode === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
  </div>

  <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
    {[{ id: "closed", lb: "Home (bell closed)" }, { id: "open", lb: "Notifications open" }].map(s => (
      <button key={s.id} onClick={() => handleView(s.id)} style={{
        background: view === s.id ? t.ac : "transparent",
        color: view === s.id ? "#FFF" : t.dm,
        border: `1px solid ${view === s.id ? t.ac : t.ln}`,
        borderRadius: 8, padding: "6px 12px", fontSize: 11,
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}>{s.lb}</button>
    ))}
  </div>

  <Phone t={t}>
    <HomeContent t={t} onBell={() => handleView(showNotifs ? "closed" : "open")} />
    <TabBar t={t} />
    {showNotifs && <NotificationPanel t={t} onClose={() => handleView("closed")} />}
  </Phone>

  <div style={{
    marginTop: 20, maxWidth: 360, textAlign: "center",
    color: t.dm, fontSize: 12, lineHeight: 1.6,
    background: t.sf, borderRadius: 12, padding: "14px 18px",
    border: `1px solid ${t.ln}`,
  }}>
    {view === "closed"
      ? "🏠 Home header now has two icons: 🔔 bell (with red badge showing unread count) and ⚙️ gear (opens settings). Tap the bell to open the notification panel."
      : "🔔 Notification panel drops down from the top with a dark backdrop. Shows emoji icon, title, description, time ago, and unread dot. Unread items have highlighted background. 'Mark all read' link at top."}
  </div>
</div>
```

);
}