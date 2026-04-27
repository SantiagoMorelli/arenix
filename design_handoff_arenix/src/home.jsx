// Home dashboard with 3 variants
function HomeScreen({ variant = 'hero' }) {
  const t = useTheme();
  const router = useRouter();
  const me = PLAYERS[2]; // Santi

  const settings = (
    <IconBtn onClick={() => router.push('settings')}><Icons.gear s={18}/></IconBtn>
  );
  const bell = (
    <IconBtn onClick={() => router.push('notifications')} badge={3}><Icons.bell s={18}/></IconBtn>
  );

  return (
    <>
    <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
      {/* Top row: greeting + actions */}
      <div style={{
        padding: '14px 0 18px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar player={me} size={40} />
          <div>
            <div style={{ fontSize: 12, color: t.dim }}>Welcome back</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>Santi</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {bell}
          {settings}
        </div>
      </div>

      {variant === 'hero' && <HeroVariant />}
      {variant === 'split' && <SplitVariant />}
      {variant === 'feed'  && <FeedVariant />}
    </div>
    <BottomNav
      items={[
        { id: 'home', icon: 'home', label: 'Home' },
        { id: 'profile', icon: 'star', label: 'Profile' },
      ]}
      active="home"
      onChange={(id) => id === 'profile' && router.push('profile')}
    />
    </>
  );
}

// ── VARIANT 1: Hero league card ────────────────────────
function HeroVariant() {
  const t = useTheme();
  const router = useRouter();
  return (
    <>
      {/* League hero card — BIG */}
      <Card
        gradient
        border={t.accentLine}
        style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}
        onClick={() => router.push('league')}
      >
        <div style={{ padding: '18px 18px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Label color={t.accent} style={{ marginBottom: 6 }}>My League</Label>
              <div className="display" style={{ fontSize: 30, lineHeight: 1, color: t.text, marginBottom: 4 }}>
                Miami Beach League
              </div>
              <div style={{ fontSize: 12, color: t.dim }}>{LEAGUE.season} · {LEAGUE.playerCount} players</div>
            </div>
            <div style={{
              background: t.accentSoft, color: t.accent,
              borderRadius: 10, padding: '8px 12px',
              textAlign: 'center', flexShrink: 0,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>RANK</div>
              <div className="display" style={{ fontSize: 26, lineHeight: 1 }}>#{LEAGUE.myRank}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {[
              { n: '3', l: 'Tourneys' },
              { n: '12', l: 'Matches' },
              { n: '8W-4L', l: 'Record' },
            ].map(s => (
              <div key={s.l} style={{
                flex: 1, background: t.bg,
                borderRadius: 10, padding: '10px 4px',
                textAlign: 'center',
              }}>
                <div className="display" style={{ fontSize: 20, color: t.text, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 9, color: t.dim, marginTop: 2, letterSpacing: 0.3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Free Play CTA */}
      <button onClick={() => useRouter().push('freeplay')} className="tap" style={{ width: '100%', textAlign: 'left', marginBottom: 20 }}>
        <div style={{
          background: `linear-gradient(135deg, ${t.freeSoft}, ${t.surface})`,
          border: `1px solid ${hexA(t.free, 0.3)}`,
          borderRadius: 14, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: hexA(t.free, 0.15), color: t.free,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.lightning s={24} c={t.free}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Free Play</div>
            <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>Quick match · Any players · No league</div>
          </div>
          <Icons.plus s={22} c={t.free}/>
        </div>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Label style={{ marginBottom: 0 }}>Recent</Label>
        <button className="tap" style={{ fontSize: 11, fontWeight: 600, color: t.accent }}>See all</button>
      </div>
      {RECENT_ACTIVITY.map(a => <ActivityRow key={a.id} a={a}/>)}

      <div style={{ height: 10 }}/>
    </>
  );
}

function ActivityRow({ a }) {
  const t = useTheme();
  const meta = {
    tournament: { icon: 'trophy', color: t.accent, soft: t.accentSoft, bc: t.ok },
    freeplay:   { icon: 'ball',   color: t.free,   soft: t.freeSoft,   bc: t.dim },
    trophy:     { icon: 'trophy', color: t.accent, soft: t.accentSoft, bc: t.accent },
  }[a.kind];
  const I = Icons[meta.icon];
  return (
    <Card style={{
      marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: meta.soft, color: meta.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><I s={18} c={meta.color}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{a.title}</div>
        <div style={{ fontSize: 11, color: t.dim, marginTop: 1 }}>{a.sub}</div>
      </div>
      <Badge color={meta.bc}>{a.badge}</Badge>
    </Card>
  );
}

// ── VARIANT 2: Split cards ─────────────────────────────
function SplitVariant() {
  const t = useTheme();
  const router = useRouter();
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Card
          onClick={() => router.push('league')}
          border={t.accentLine}
          style={{ padding: 14, background: `linear-gradient(160deg, ${t.surface}, ${t.alt})`, height: 170 }}
        >
          <Label color={t.accent} style={{ marginBottom: 8 }}>League</Label>
          <div className="display" style={{ fontSize: 22, color: t.text, lineHeight: 1.05 }}>Miami<br/>Beach</div>
          <div style={{ fontSize: 10, color: t.dim, marginTop: 6 }}>Season 2026</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="display" style={{ fontSize: 30, color: t.accent, lineHeight: 1 }}>#3</span>
            <span style={{ fontSize: 10, color: t.dim }}>of 24</span>
          </div>
        </Card>
        <Card
          onClick={() => router.push('freeplay')}
          border={hexA(t.free, 0.35)}
          style={{ padding: 14, background: `linear-gradient(160deg, ${t.freeSoft}, ${t.surface})`, height: 170 }}
        >
          <Label color={t.free} style={{ marginBottom: 8 }}>Free Play</Label>
          <div className="display" style={{ fontSize: 22, color: t.text, lineHeight: 1.05 }}>Quick<br/>Match</div>
          <div style={{ fontSize: 10, color: t.dim, marginTop: 6 }}>No league</div>
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 6, color: t.free }}>
            <Icons.plus s={18}/> <span style={{ fontSize: 12, fontWeight: 700 }}>Start</span>
          </div>
        </Card>
      </div>

      <Label>Recent</Label>
      {RECENT_ACTIVITY.map(a => <ActivityRow key={a.id} a={a}/>)}
      <div style={{ height: 10 }}/>
    </>
  );
}

// ── VARIANT 3: Feed ──────────────────────────────────
function FeedVariant() {
  const t = useTheme();
  const router = useRouter();
  return (
    <>
      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto', padding: '0 0 14px',
        marginBottom: 4, scrollbarWidth: 'none',
      }}>
        {[
          { label: 'League', icon: 'trophy', color: t.accent, route: 'league' },
          { label: 'Free Play', icon: 'lightning', color: t.free, route: 'freeplay' },
          { label: 'Tourney', icon: 'trophy', color: t.accent, route: 'tournament' },
          { label: 'Invite', icon: 'users', color: t.dim, route: null },
        ].map(a => {
          const I = Icons[a.icon];
          return (
            <button key={a.label} className="tap" onClick={() => a.route && router.push(a.route)} style={{
              flex: '0 0 80px', padding: '12px 8px', borderRadius: 12,
              background: hexA(a.color, 0.1), border: `1px solid ${hexA(a.color, 0.25)}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              color: a.color,
            }}>
              <I s={22} c={a.color}/>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{a.label}</span>
            </button>
          );
        })}
      </div>

      <Label>Your league</Label>
      <Card gradient border={t.accentLine} onClick={() => router.push('league')} style={{ marginBottom: 14, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{LEAGUE.name}</div>
            <div style={{ fontSize: 11, color: t.dim, marginTop: 1 }}>Ranked #{LEAGUE.myRank} of {LEAGUE.playerCount}</div>
          </div>
          <Icons.chevR s={18} c={t.dim}/>
        </div>
      </Card>

      <Label>Activity</Label>
      {RECENT_ACTIVITY.map(a => <ActivityRow key={a.id} a={a}/>)}
      <div style={{ height: 10 }}/>
    </>
  );
}

Object.assign(window, { HomeScreen });
