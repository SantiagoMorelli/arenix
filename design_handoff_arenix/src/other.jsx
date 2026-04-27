// Profile, Free Play, Notifications, Settings screens

function ProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const me = PLAYERS[2];
  return (
    <>
      <PageHeader title="Profile" onBack={() => router.pop()} rightSlot={<IconBtn onClick={() => router.push('settings')}><Icons.gear s={18}/></IconBtn>}/>
      <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        <Card gradient style={{ padding: 18, marginBottom: 14, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Avatar player={me} size={76}/>
          </div>
          <div className="display" style={{ fontSize: 24, color: t.text, lineHeight: 1 }}>{me.name}</div>
          <div style={{ fontSize: 11, color: t.dim, marginTop: 4 }}>@santi.a · Miami Beach League</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16 }}>
            <div><div className="display" style={{ fontSize: 22, color: t.accent, lineHeight: 1 }}>{me.elo}</div><div style={{ fontSize: 10, color: t.dim, marginTop: 2 }}>ELO</div></div>
            <div><div className="display" style={{ fontSize: 22, color: t.text, lineHeight: 1 }}>#3</div><div style={{ fontSize: 10, color: t.dim, marginTop: 2 }}>Rank</div></div>
            <div><div className="display" style={{ fontSize: 22, color: t.ok, lineHeight: 1 }}>67%</div><div style={{ fontSize: 10, color: t.dim, marginTop: 2 }}>Win rate</div></div>
          </div>
        </Card>

        <Label color={t.accent}>Signature shots</Label>
        <Card style={{ padding: 14, marginBottom: 14 }}>
          {[
            { label: 'Spikes', v: 42, pct: 72, c: t.accent },
            { label: 'Blocks', v: 28, pct: 58, c: t.free },
            { label: 'Aces',   v: 15, pct: 34, c: t.ok },
          ].map((x, i) => (
            <div key={x.label} style={{ marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: t.text, fontWeight: 600 }}>{x.label}</span>
                <span className="display" style={{ color: x.c, fontSize: 14, lineHeight: 1 }}>{x.v}</span>
              </div>
              <div style={{ height: 6, background: t.alt, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: x.pct+'%', height: '100%', background: x.c }}/>
              </div>
            </div>
          ))}
        </Card>

        <Label color={t.accent}>Achievements</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { e: '🔥', n: 'Hot streak' },
            { e: '🏆', n: 'Champion' },
            { e: '⚡', n: 'Ace master' },
            { e: '🛡️', n: 'Wall' },
            { e: '💯', n: '100 matches' },
            { e: '🎯', n: 'Sharpshooter' },
          ].map(a => (
            <div key={a.n} style={{
              background: t.surface, border: `1px solid ${t.line}`, borderRadius: 12,
              padding: '14px 6px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{a.e}</div>
              <div style={{ fontSize: 10, color: t.dim }}>{a.n}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 10 }}/>
      </div>
      <BottomNav items={[
        { id: 'home', icon: 'home', label: 'Home' },
        { id: 'profile', icon: 'star', label: 'Profile' },
      ]} active="profile" onChange={(id) => id === 'home' && router.replace('home')}/>
    </>
  );
}

function FreePlayScreen() {
  const t = useTheme();
  const router = useRouter();
  const [players, setPlayers] = useState(['p1','p2','p3','p4']);
  return (
    <>
      <PageHeader title="Free Play" sub="Quick match, no league" onBack={() => router.pop()}/>
      <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        <Card style={{ padding: 14, marginBottom: 14, background: `linear-gradient(135deg, ${t.freeSoft}, ${t.surface})`, border: `1px solid ${hexA(t.free, 0.3)}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.lightning s={22} c={t.free}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Free Play</div>
              <div style={{ fontSize: 11, color: t.dim }}>Stats won't affect your league ELO</div>
            </div>
          </div>
        </Card>
        <Label>Players (4)</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {players.map((pid, i) => {
            const p = PLAYERS.find(x => x.id === pid);
            return (
              <Card key={i} style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar player={p} size={32}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: t.dim }}>Team {i < 2 ? 'A' : 'B'}</div>
                </div>
              </Card>
            );
          })}
        </div>
        <Btn variant="surface" icon={<Icons.plus s={16}/>}>Add player</Btn>
        <div style={{ height: 14 }}/>
        <Label>Rules</Label>
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {[
            ['Scoring', 'First to 21'],
            ['Sets', 'Single set'],
            ['Timeout', 'None'],
          ].map(([k,v], i) => (
            <div key={k} style={{ display: 'flex', padding: '12px 14px', borderBottom: i < 2 ? `1px solid ${t.line}` : 'none' }}>
              <span style={{ flex: 1, fontSize: 13, color: t.text }}>{k}</span>
              <span style={{ fontSize: 12, color: t.dim, marginRight: 8 }}>{v}</span>
              <Icons.chevR s={14} c={t.dim}/>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ padding: 14, borderTop: `1px solid ${t.line}`, background: t.surface, flexShrink: 0 }}>
        <Btn onClick={() => router.replace('live')} color={t.free}>🏐 Start Free Play</Btn>
      </div>
    </>
  );
}

function NotificationsScreen() {
  const t = useTheme();
  const router = useRouter();
  const notes = [
    { id: 1, kind: 'match', icon: '🏐', title: 'Alpha vs Bravo', sub: 'Your match starts in 15 min', time: 'Now', unread: true, c: t.ok },
    { id: 2, kind: 'rank',  icon: '📈', title: "You've moved up to #3", sub: 'Up 2 positions this week', time: '2h', unread: true, c: t.accent },
    { id: 3, kind: 'inv',   icon: '📩', title: 'Summer Classic invite', sub: 'Maria K. invited you', time: '1d', unread: true, c: t.free },
    { id: 4, kind: 'res',   icon: '🏆', title: 'Team Alpha won 2-1', sub: 'Spring Cup · Day 1', time: '2d', unread: false, c: t.accent },
    { id: 5, kind: 'ach',   icon: '🔥', title: 'Hot streak unlocked', sub: '5 wins in a row', time: '3d', unread: false, c: t.accent },
  ];
  return (
    <>
      <PageHeader title="Notifications" onBack={() => router.pop()} rightSlot={<IconBtn><Icons.check s={18}/></IconBtn>}/>
      <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        <div style={{ height: 10 }}/>
        {notes.map(n => (
          <Card key={n.id} style={{
            padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12,
            background: n.unread ? hexA(n.c, 0.08) : t.surface,
            border: `1px solid ${n.unread ? hexA(n.c, 0.2) : t.line}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: hexA(n.c, 0.18),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>{n.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{n.title}</div>
              <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>{n.sub}</div>
            </div>
            <div style={{ fontSize: 10, color: t.dim, flexShrink: 0 }}>
              {n.time}
              {n.unread && <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.c, marginTop: 4, marginLeft: 'auto' }}/>}
            </div>
          </Card>
        ))}
        <div style={{ height: 10 }}/>
      </div>
    </>
  );
}

function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const me = PLAYERS[2];
  const sections = [
    { title: 'Account', items: [
      { icon: '👤', label: 'Profile', v: me.name },
      { icon: '📧', label: 'Email', v: 'santi.a@volley.app' },
      { icon: '🔔', label: 'Notifications', v: 'All' },
    ]},
    { title: 'Play', items: [
      { icon: '🏐', label: 'Default scoring', v: 'First to 21' },
      { icon: '📊', label: 'Public stats', v: 'On' },
      { icon: '🎽', label: 'Preferred position', v: 'Outside hitter' },
    ]},
    { title: 'App', items: [
      { icon: '🌙', label: 'Appearance', v: 'System' },
      { icon: '🔒', label: 'Privacy', v: null },
      { icon: '❓', label: 'Help & support', v: null },
      { icon: '📄', label: 'About', v: 'v2.4.0' },
    ]},
  ];
  return (
    <>
      <PageHeader title="Settings" onBack={() => router.pop()}/>
      <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        {sections.map(s => (
          <React.Fragment key={s.title}>
            <Label color={t.accent} style={{ marginTop: 12 }}>{s.title}</Label>
            <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
              {s.items.map((it, i) => (
                <div key={it.label} style={{
                  display: 'flex', alignItems: 'center', padding: '13px 14px', gap: 10,
                  borderBottom: i < s.items.length - 1 ? `1px solid ${t.line}` : 'none',
                }}>
                  <span style={{ fontSize: 16 }}>{it.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: t.text }}>{it.label}</span>
                  {it.v && <span style={{ fontSize: 12, color: t.dim, marginRight: 8 }}>{it.v}</span>}
                  <Icons.chevR s={14} c={t.dim}/>
                </div>
              ))}
            </Card>
          </React.Fragment>
        ))}
        <Card style={{ padding: '13px 14px', marginBottom: 14, color: t.err, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          Sign out
        </Card>
        <div style={{ textAlign: 'center', fontSize: 10, color: t.dim, padding: '6px 0 16px' }}>
          Volley · Made for beach players
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ProfileScreen, FreePlayScreen, NotificationsScreen, SettingsScreen });
