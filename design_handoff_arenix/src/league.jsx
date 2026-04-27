// League detail — 4 tabs
function LeagueScreen() {
  const t = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState('rankings');

  return (
    <>
      <PageHeader
        title={LEAGUE.name}
        sub={LEAGUE.season + ' · ' + LEAGUE.location}
        onBack={() => router.pop()}
        rightSlot={<IconBtn onClick={() => router.push('notifications')} badge={3}><Icons.bell s={18}/></IconBtn>}
      />
      <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        {tab === 'rankings' && <RankingsTab/>}
        {tab === 'players'  && <LeaguePlayersTab/>}
        {tab === 'tourneys' && <TourneysTab/>}
        {tab === 'lsettings'&& <LeagueSettingsTab/>}
      </div>
      <BottomNav
        items={[
          { id: 'rankings', icon: 'chart',  label: 'Rankings' },
          { id: 'players',  icon: 'users',  label: 'Players' },
          { id: 'tourneys', icon: 'trophy', label: 'Tourneys' },
          { id: 'lsettings',icon: 'gear',   label: 'Settings' },
        ]}
        active={tab}
        onChange={setTab}
      />
    </>
  );
}

function RankingsTab() {
  const t = useTheme();
  return (
    <>
      <Card gradient style={{ marginTop: 8, marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Label color={t.accent} style={{ marginBottom: 4 }}>Your position</Label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="display" style={{ fontSize: 40, color: t.accent, lineHeight: 1 }}>#3</span>
              <span style={{ fontSize: 12, color: t.dim }}>of 24 · 1,572 ELO</span>
            </div>
            <div style={{ fontSize: 11, color: t.ok, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icons.arrowUp s={12}/> Up 2 this week
            </div>
          </div>
          <div style={{ width: 80, height: 60 }}>
            <svg width="100%" height="100%" viewBox="0 0 80 60">
              <polyline points="0,50 15,42 30,44 45,30 60,28 80,18"
                stroke={t.accent} strokeWidth="2" fill="none" strokeLinecap="round"/>
              <polyline points="0,50 15,42 30,44 45,30 60,28 80,18 80,60 0,60"
                fill={hexA(t.accent, 0.15)} stroke="none"/>
            </svg>
          </div>
        </div>
      </Card>

      <Label color={t.accent}>Top players</Label>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {PLAYERS.slice(0, 8).map((p, i) => {
          const isMe = p.id === 'p3';
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center',
              padding: '11px 14px',
              borderBottom: i < 7 ? `1px solid ${t.line}` : 'none',
              background: isMe ? t.accentSoft : 'transparent',
            }}>
              <span className="display" style={{
                width: 28, fontSize: 18, lineHeight: 1,
                color: i < 3 ? t.accent : t.dim,
              }}>{i + 1}</span>
              <Avatar player={p} size={32}/>
              <div style={{ flex: 1, marginLeft: 10 }}>
                <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: t.text }}>
                  {p.name}{isMe && <span style={{ color: t.accent, marginLeft: 6, fontSize: 10 }}>YOU</span>}
                </div>
                <div style={{ fontSize: 10, color: t.dim }}>{10 + i}W - {3 + (i % 4)}L</div>
              </div>
              <span className="display" style={{ fontSize: 18, color: t.text, lineHeight: 1 }}>{p.elo}</span>
            </div>
          );
        })}
      </Card>

      <div style={{ height: 10 }}/>
    </>
  );
}

function LeaguePlayersTab() {
  const t = useTheme();
  return (
    <>
      <div style={{ display: 'flex', gap: 8, margin: '8px 0 14px' }}>
        <div style={{
          flex: 1, background: t.surface, border: `1px solid ${t.line}`,
          borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icons.users s={16} c={t.dim}/>
          <span style={{ fontSize: 12, color: t.dim }}>Search 24 players…</span>
        </div>
        <IconBtn><Icons.plus s={18}/></IconBtn>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {PLAYERS.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            borderBottom: i < PLAYERS.length - 1 ? `1px solid ${t.line}` : 'none',
          }}>
            <Avatar player={p} size={34}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</div>
              <div style={{ fontSize: 10, color: t.dim }}>ELO {p.elo}</div>
            </div>
            <Icons.chevR s={16} c={t.dim}/>
          </div>
        ))}
      </Card>
      <div style={{ height: 10 }}/>
    </>
  );
}

function TourneysTab() {
  const t = useTheme();
  const router = useRouter();
  const list = [
    { id: 't1', nm: 'Spring Cup',    st: 'In Progress', sc: t.ok,     n: 8, dt: 'Mar 14 - 21' },
    { id: 't2', nm: 'Summer Classic',st: 'Upcoming',    sc: t.accent, n: 12, dt: 'Jun 6 - 14' },
    { id: 't3', nm: 'Winter Clash',  st: 'Completed',   sc: t.dim,    n: 12, dt: 'Jan 11 - 19' },
  ];
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 12px' }}>
        <Label color={t.accent} style={{ marginBottom: 0 }}>Tournaments</Label>
        <button className="tap" onClick={() => router.push('tsetup')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: t.accent, fontSize: 12, fontWeight: 700 }}>
          <Icons.plus s={14}/> New
        </button>
      </div>
      {list.map(x => (
        <Card key={x.id} style={{
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
        }} onClick={() => x.st === 'In Progress' && router.push('tournament')}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: t.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icons.trophy s={18} c={t.accent}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{x.nm}</div>
            <div style={{ fontSize: 11, color: t.dim }}>{x.n} players · {x.dt}</div>
          </div>
          <Badge color={x.sc}>{x.st}</Badge>
        </Card>
      ))}
      <div style={{ height: 10 }}/>
    </>
  );
}

function LeagueSettingsTab() {
  const t = useTheme();
  const rows = [
    { label: 'League name', value: LEAGUE.name },
    { label: 'Season', value: LEAGUE.season },
    { label: 'Location', value: LEAGUE.location },
    { label: 'Points system', value: 'ELO' },
    { label: 'Visibility', value: 'Private' },
  ];
  return (
    <>
      <Label color={t.accent} style={{ marginTop: 10 }}>General</Label>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', alignItems: 'center', padding: '13px 14px',
            borderBottom: i < rows.length - 1 ? `1px solid ${t.line}` : 'none',
          }}>
            <span style={{ flex: 1, fontSize: 13, color: t.text }}>{r.label}</span>
            <span style={{ fontSize: 12, color: t.dim, marginRight: 8 }}>{r.value}</span>
            <Icons.chevR s={14} c={t.dim}/>
          </div>
        ))}
      </Card>
      <Label color={t.accent}>Danger</Label>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '13px 14px', color: t.err, fontSize: 13, fontWeight: 600 }}>Leave league</div>
      </Card>
      <div style={{ height: 10 }}/>
    </>
  );
}

Object.assign(window, { LeagueScreen });
