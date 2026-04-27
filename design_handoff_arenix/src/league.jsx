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
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'remove'|'unlink', player }
  const [toast, setToast] = useState('');
  const [players, setPlayers] = useState(PLAYERS);

  const linkedCount = players.filter(p => p.linked).length;

  function updatePlayer(id, patch) {
    setPlayers(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
    setSelected(s => s && s.id === id ? { ...s, ...patch } : s);
  }
  function removePlayer(id) {
    setPlayers(ps => ps.filter(p => p.id !== id));
    setSelected(null); setConfirm(null);
    setToast('Player removed'); setTimeout(() => setToast(''), 1800);
  }
  function unlinkPlayer(id) {
    updatePlayer(id, { linked: false, email: null });
    setConfirm(null);
    setToast('Account unlinked'); setTimeout(() => setToast(''), 1800);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, margin: '8px 0 10px' }}>
        <div style={{
          flex: 1, background: t.surface, border: `1px solid ${t.line}`,
          borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icons.users s={16} c={t.dim}/>
          <span style={{ fontSize: 12, color: t.dim }}>Search {players.length} players…</span>
        </div>
        <IconBtn><Icons.plus s={18}/></IconBtn>
      </div>

      {/* Tiny legend — admin context, doesn't disturb rows */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 10, color: t.dim, margin: '0 2px 8px',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: t.ok, boxShadow: `0 0 0 2px ${hexA(t.ok, 0.18)}`,
          }}/>
          {linkedCount} linked
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'transparent', border: `1.5px solid ${t.dim}`,
          }}/>
          {players.length - linkedCount} guest
        </span>
        <span style={{ marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
          Tap to manage
        </span>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {players.map((p, i) => (
          <div key={p.id} className="tap" onClick={() => setSelected(p)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            borderBottom: i < players.length - 1 ? `1px solid ${t.line}` : 'none',
            cursor: 'pointer',
          }}>
            <div style={{ position: 'relative' }}>
              <Avatar player={p} size={34}/>
              {/* link status dot — overlay on avatar so row layout is unchanged */}
              <span title={p.linked ? 'Linked account' : 'Guest player'} style={{
                position: 'absolute', right: -1, bottom: -1,
                width: 11, height: 11, borderRadius: '50%',
                background: p.linked ? t.ok : t.surface,
                border: `2px solid ${t.surface}`,
                boxShadow: p.linked ? `0 0 0 1px ${t.ok}` : `0 0 0 1px ${t.dim}`,
              }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</div>
              <div style={{ fontSize: 10, color: t.dim }}>
                ELO {p.elo} · {p.level}
              </div>
            </div>
            <Icons.chevR s={16} c={t.dim}/>
          </div>
        ))}
      </Card>
      <div style={{ height: 10 }}/>

      <PlayerDetailSheet
        player={selected}
        onClose={() => setSelected(null)}
        onSave={(patch) => updatePlayer(selected.id, patch)}
        onUnlink={() => setConfirm({ kind: 'unlink', player: selected })}
        onRemove={() => setConfirm({ kind: 'remove', player: selected })}
      />

      <ConfirmSheet
        confirm={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm.kind === 'remove') removePlayer(confirm.player.id);
          if (confirm.kind === 'unlink') unlinkPlayer(confirm.player.id);
        }}
      />

      <Toast message={toast}/>
    </>
  );
}

// Detail / edit sheet — full name, nickname, gender, level, link status
function PlayerDetailSheet({ player, onClose, onSave, onUnlink, onRemove, forceEditing }) {
  const t = useTheme();
  const [editing, setEditing] = useState(!!forceEditing);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (player) { setDraft({ name: player.name, nickname: player.nickname, gender: player.gender, level: player.level }); setEditing(!!forceEditing); }
  }, [player && player.id, forceEditing]);

  if (!player || !draft) return null;

  const genders = [{ k:'F', l:'Female' }, { k:'M', l:'Male' }, { k:'X', l:'Other' }];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];

  function save() {
    onSave({ name: draft.name, nickname: draft.nickname, gender: draft.gender, level: draft.level });
    setEditing(false);
  }

  return (
    <Sheet open={!!player} onClose={onClose}>
      {/* Header strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <Avatar player={player} size={56}/>
          <span style={{
            position: 'absolute', right: -2, bottom: -2,
            width: 16, height: 16, borderRadius: '50%',
            background: player.linked ? t.ok : t.surface,
            border: `3px solid ${t.bg}`,
            boxShadow: player.linked ? 'none' : `inset 0 0 0 1.5px ${t.dim}`,
          }}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{player.name}</div>
          <div style={{ fontSize: 11, color: t.dim, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {player.linked ? (
              <>
                <Icons.check s={11} c={t.ok}/>
                <span style={{ color: t.ok, fontWeight: 600 }}>Linked</span>
                <span>· {player.email}</span>
              </>
            ) : (
              <>
                <span style={{ color: t.dim, fontWeight: 600 }}>Guest player</span>
                <span>· no account</span>
              </>
            )}
          </div>
        </div>
        <button className="tap" onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 16, background: t.alt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.close s={14} c={t.dim}/>
        </button>
      </div>

      {/* Detail rows OR edit form */}
      {!editing ? (
        <div style={{
          background: t.surface, border: `1px solid ${t.line}`,
          borderRadius: 12, overflow: 'hidden', marginBottom: 14,
        }}>
          <DetailRow label="Full name" value={player.name}/>
          <DetailRow label="Nickname"  value={player.nickname || '—'}/>
          <DetailRow label="Gender"    value={
            player.gender === 'F' ? 'Female' :
            player.gender === 'M' ? 'Male'   : 'Other'
          }/>
          <DetailRow label="Level"     value={
            <span style={{
              display: 'inline-block',
              padding: '3px 10px', borderRadius: 999,
              background: t.accentSoft, color: t.accent,
              fontSize: 12, fontWeight: 700,
            }}>{player.level}</span>
          }/>
          <DetailRow label="ELO"       value={
            <span className="display" style={{ fontSize: 16, color: t.text }}>{player.elo}</span>
          } last/>
        </div>
      ) : (
        <div style={{
          background: t.surface, border: `1px solid ${t.line}`,
          borderRadius: 12, padding: 12, marginBottom: 14,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <Field label="Full name">
            <input value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})}
              style={inputStyle(t)}/>
          </Field>
          <Field label="Nickname">
            <input value={draft.nickname || ''} onChange={e => setDraft({...draft, nickname: e.target.value})}
              placeholder="Optional"
              style={inputStyle(t)}/>
          </Field>
          <Field label="Gender">
            <div style={{ display: 'flex', gap: 6 }}>
              {genders.map(g => (
                <button key={g.k} className="tap" onClick={() => setDraft({...draft, gender: g.k})}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8,
                    border: `1px solid ${draft.gender === g.k ? t.accent : t.line}`,
                    background: draft.gender === g.k ? t.accentSoft : 'transparent',
                    color: draft.gender === g.k ? t.accent : t.text,
                    fontSize: 12, fontWeight: 600,
                  }}>{g.l}</button>
              ))}
            </div>
          </Field>
          <Field label="Level">
            <div style={{ display: 'flex', gap: 6 }}>
              {levels.map(lv => (
                <button key={lv} className="tap" onClick={() => setDraft({...draft, level: lv})}
                  style={{
                    flex: 1, padding: '9px 6px', borderRadius: 8,
                    border: `1px solid ${draft.level === lv ? t.accent : t.line}`,
                    background: draft.level === lv ? t.accent : 'transparent',
                    color: draft.level === lv ? '#fff' : t.text,
                    fontSize: 12, fontWeight: 600,
                  }}>{lv}</button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* Action row */}
      {!editing ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Btn variant="primary" icon={<Icons.edit s={14}/>} onClick={() => setEditing(true)} style={{ flex: 1 }}>
              Edit details
            </Btn>
            {player.linked && (
              <Btn variant="ghost" icon={<Icons.x s={14}/>} onClick={onUnlink} style={{ flex: 1 }}>
                Unlink
              </Btn>
            )}
          </div>
          <button className="tap" onClick={onRemove} style={{
            width: '100%', padding: '12px 0', borderRadius: 10,
            background: 'transparent', border: `1px solid ${hexA(t.err, 0.4)}`,
            color: t.err, fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icons.x s={14}/> Remove from league
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => setEditing(false)} style={{ flex: 1 }}>Cancel</Btn>
          <Btn variant="primary" icon={<Icons.check s={14}/>} onClick={save} style={{ flex: 1 }}>Save</Btn>
        </div>
      )}
    </Sheet>
  );
}

function DetailRow({ label, value, last }) {
  const t = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '12px 14px',
      borderBottom: last ? 'none' : `1px solid ${t.line}`,
      minHeight: 44,
    }}>
      <span style={{ flex: '0 0 96px', fontSize: 11, color: t.dim, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: t.text, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  const t = useTheme();
  return (
    <div>
      <div style={{ fontSize: 10, color: t.dim, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function inputStyle(t) {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${t.line}`, background: t.bg,
    color: t.text, fontSize: 13, fontFamily: 'inherit',
    outline: 'none',
  };
}

function ConfirmSheet({ confirm, onCancel, onConfirm }) {
  const t = useTheme();
  if (!confirm) return null;
  const isRemove = confirm.kind === 'remove';
  return (
    <Sheet open={!!confirm} onClose={onCancel}>
      <div style={{
        width: 48, height: 48, borderRadius: 24,
        background: hexA(t.err, 0.12), color: t.err,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
      }}>
        <Icons.x s={22}/>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: t.text, textAlign: 'center', marginBottom: 6 }}>
        {isRemove ? 'Remove player?' : 'Unlink account?'}
      </div>
      <div style={{ fontSize: 12, color: t.dim, textAlign: 'center', marginBottom: 18, padding: '0 12px', lineHeight: 1.5 }}>
        {isRemove
          ? <>This removes <b style={{ color: t.text }}>{confirm.player.name}</b> from the league. Match history is preserved.</>
          : <>The user account stays, but <b style={{ color: t.text }}>{confirm.player.name}</b> becomes a guest profile you control.</>
        }
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</Btn>
        <button className="tap" onClick={onConfirm} style={{
          flex: 1, padding: '12px 0', borderRadius: 10,
          background: t.err, color: '#fff', fontSize: 13, fontWeight: 700,
        }}>
          {isRemove ? 'Remove' : 'Unlink'}
        </button>
      </div>
    </Sheet>
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
