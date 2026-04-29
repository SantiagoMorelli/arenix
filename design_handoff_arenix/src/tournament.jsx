// Tournament detail + setup wizard
function TournamentScreen() {
  const t = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState('standings');

  return (
    <>
      <PageHeader
        title={TOURNAMENT.name}
        sub={TOURNAMENT.stage}
        onBack={() => router.pop()}
        badge="LIVE"
        badgeColor={t.ok}
      />
      <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        {tab === 'standings' && <StandingsTab/>}
        {tab === 'matches'   && <MatchesTab/>}
        {tab === 'players'   && <TourneyPlayersTab/>}
      </div>
      <div style={{ display: 'flex', borderTop: `1px solid ${t.line}`, background: t.surface }}>
        {[
          { id: 'standings', label: 'Standings' },
          { id: 'matches',   label: 'Matches' },
          { id: 'players',   label: 'Players' },
        ].map(it => (
          <button key={it.id} onClick={() => setTab(it.id)} className="tap" style={{
            flex: 1, padding: '14px 0',
            fontSize: 12, fontWeight: 700,
            color: tab === it.id ? t.accent : t.dim,
            borderBottom: tab === it.id ? `2px solid ${t.accent}` : '2px solid transparent',
          }}>{it.label}</button>
        ))}
      </div>
    </>
  );
}

function StandingsTab() {
  const t = useTheme();
  const router = useRouter();
  const teams = TOURNAMENT.teams;
  return (
    <>
      <Card
        gradient
        border={hexA(t.ok, 0.4)}
        style={{ marginTop: 10, marginBottom: 14, padding: 16 }}
        onClick={() => router.push('live')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className="dot-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: t.ok, color: t.ok }}/>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.ok, letterSpacing: 1 }}>LIVE · SET 2</span>
          <span style={{ fontSize: 11, color: t.dim, marginLeft: 'auto' }}>Court 3 · to 21</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: t.dim, marginBottom: 2 }}>Alpha</div>
            <div className="display" style={{ fontSize: 40, color: t.accent, lineHeight: 1 }}>15</div>
            <div style={{ fontSize: 10, color: t.dim, marginTop: 4 }}>Sets 1-0</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.dim }}>VS</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: t.dim, marginBottom: 2 }}>Bravo</div>
            <div className="display" style={{ fontSize: 40, color: t.text, lineHeight: 1 }}>12</div>
            <div style={{ fontSize: 10, color: t.dim, marginTop: 4 }}>Sets 0-1</div>
          </div>
        </div>
      </Card>

      <Label color={t.accent}>Standings</Label>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '24px 1fr 40px 40px 40px',
          padding: '9px 14px', background: t.alt, fontSize: 10, fontWeight: 700,
          color: t.dim, letterSpacing: 0.8, textTransform: 'uppercase', gap: 8,
        }}>
          <span>#</span><span>Team</span><span style={{ textAlign: 'right' }}>W</span>
          <span style={{ textAlign: 'right' }}>L</span><span style={{ textAlign: 'right' }}>PTS</span>
        </div>
        {teams.map((team, i) => {
          const p1 = PLAYERS.find(p => p.id === team.players[0]);
          const p2 = PLAYERS.find(p => p.id === team.players[1]);
          return (
            <div key={team.id} style={{
              display: 'grid', gridTemplateColumns: '24px 1fr 40px 40px 40px',
              padding: '11px 14px', gap: 8, alignItems: 'center',
              borderBottom: i < teams.length - 1 ? `1px solid ${t.line}` : 'none',
            }}>
              <span className="display" style={{ fontSize: 18, color: i < 2 ? t.accent : t.dim, lineHeight: 1 }}>{i+1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Team {team.name}</div>
                <div style={{ fontSize: 10, color: t.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p1.short} · {p2.short}
                </div>
              </div>
              <span className="display" style={{ fontSize: 16, color: t.ok, textAlign: 'right', lineHeight: 1 }}>{team.w}</span>
              <span className="display" style={{ fontSize: 16, color: t.err, textAlign: 'right', lineHeight: 1 }}>{team.l}</span>
              <span className="display" style={{ fontSize: 16, color: t.text, textAlign: 'right', lineHeight: 1 }}>{team.w * 3}</span>
            </div>
          );
        })}
      </Card>
      <div style={{ height: 10 }}/>
    </>
  );
}

function MatchesTab() {
  const t = useTheme();
  const router = useRouter();
  const matches = [
    { id: 'm1', a: 'Alpha', b: 'Bravo', sa: 15, sb: 12, status: 'live', court: 3 },
    { id: 'm2', a: 'Charlie', b: 'Delta', sa: 21, sb: 18, status: 'done', court: 1 },
    { id: 'm3', a: 'Alpha', b: 'Charlie', sa: 21, sb: 16, status: 'done', court: 2 },
    { id: 'm4', a: 'Bravo', b: 'Delta', sa: 21, sb: 14, status: 'done', court: 1 },
    { id: 'm5', a: 'Alpha', b: 'Delta', sa: null, sb: null, status: 'up', court: 2, time: 'Tonight 8pm' },
    { id: 'm6', a: 'Bravo', b: 'Charlie', sa: null, sb: null, status: 'up', court: 3, time: 'Tomorrow 6pm' },
  ];
  return (
    <>
      <Label color={t.accent} style={{ marginTop: 10 }}>Day 2 · Round Robin</Label>
      {matches.map(m => {
        const isLive = m.status === 'live';
        const isDone = m.status === 'done';
        const winA = isDone && m.sa > m.sb;
        return (
          <Card key={m.id} style={{ marginBottom: 8, padding: '12px 14px' }} onClick={() => isLive && router.push('live')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isLive && <span className="dot-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: t.ok, color: t.ok }}/>}
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                  color: isLive ? t.ok : isDone ? t.dim : t.accent,
                }}>{isLive ? 'LIVE' : isDone ? 'FINAL' : 'UPCOMING'}</span>
              </div>
              <span style={{ fontSize: 10, color: t.dim }}>Court {m.court}{m.time ? ' · ' + m.time : ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: winA ? 700 : 500, color: winA ? t.text : t.text }}>Team {m.a}</div>
              </div>
              {m.sa != null ? (
                <span className="display" style={{ fontSize: 22, color: winA ? t.accent : t.dim, lineHeight: 1 }}>{m.sa}</span>
              ) : <span style={{ fontSize: 12, color: t.dim }}>—</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: !winA && isDone ? 700 : 500, color: t.text }}>Team {m.b}</div>
              </div>
              {m.sb != null ? (
                <span className="display" style={{ fontSize: 22, color: !winA && isDone ? t.accent : t.dim, lineHeight: 1 }}>{m.sb}</span>
              ) : <span style={{ fontSize: 12, color: t.dim }}>—</span>}
            </div>
          </Card>
        );
      })}
      <div style={{ height: 10 }}/>
    </>
  );
}

function TourneyPlayersTab() {
  const t = useTheme();
  return (
    <>
      <Label color={t.accent} style={{ marginTop: 10 }}>Teams · 8 players</Label>
      {TOURNAMENT.teams.map(team => {
        const p1 = PLAYERS.find(p => p.id === team.players[0]);
        const p2 = PLAYERS.find(p => p.id === team.players[1]);
        return (
          <Card key={team.id} style={{ marginBottom: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Team {team.name}</span>
              <span className="display" style={{ fontSize: 16, color: t.accent, lineHeight: 1 }}>{team.w}W - {team.l}L</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[p1, p2].map(p => (
                <div key={p.id} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                  background: t.alt, borderRadius: 10, padding: '8px 10px',
                }}>
                  <Avatar player={p} size={26}/>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{p.short}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      <div style={{ height: 10 }}/>
    </>
  );
}

// ─── Tournament Setup Wizard ────────────────────────────
function TournamentSetup() {
  const t = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(['p1','p2','p3','p4','p5','p6','p7','p8']);
  const [teamSize, setTeamSize] = useState(2);
  const [sets, setSets] = useState(1);
  const [teams, setTeams] = useState('auto');
  // Step 3 state
  const [balanceOrder, setBalanceOrder] = useState([]); // ordered list of 'sex' | 'level'
  const [generated, setGenerated] = useState(null);     // array of {id, name, players[]}
  const [confirmed, setConfirmed] = useState(false);
  const [manualTeams, setManualTeams] = useState([]);   // [{id, name, players: [pid,...]}]
  const [pickerForTeam, setPickerForTeam] = useState(null); // teamId or null

  const toggleBalance = (key) => {
    setBalanceOrder(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    setGenerated(null);
    setConfirmed(false);
  };

  const buildAutoTeams = () => {
    const teamLabels = ['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot','Golf','Hotel'];
    const pool = selected.map(id => PLAYERS.find(p => p.id === id)).filter(Boolean);
    const numTeams = Math.max(2, Math.floor(pool.length / teamSize));
    let ordered = [...pool];
    if (balanceOrder[0] === 'sex') {
      const males = pool.filter(p => p.gender === 'M');
      const females = pool.filter(p => p.gender === 'F');
      const others = pool.filter(p => p.gender !== 'M' && p.gender !== 'F');
      if (balanceOrder[1] === 'level') {
        const lvlOrder = { 'Advanced': 0, 'Intermediate': 1, 'Beginner': 2 };
        [males, females, others].forEach(g => g.sort((a,b) => (lvlOrder[a.level]||0) - (lvlOrder[b.level]||0)));
      }
      ordered = [];
      const max = Math.max(males.length, females.length, others.length);
      for (let i = 0; i < max; i++) { if (males[i]) ordered.push(males[i]); if (females[i]) ordered.push(females[i]); if (others[i]) ordered.push(others[i]); }
    } else if (balanceOrder[0] === 'level') {
      const lvlOrder = { 'Advanced': 0, 'Intermediate': 1, 'Beginner': 2 };
      ordered = [...pool].sort((a,b) => (lvlOrder[a.level]||0) - (lvlOrder[b.level]||0));
    } else {
      ordered = [...pool].sort(() => Math.random() - 0.5);
    }
    // Snake distribution
    const buckets = Array.from({ length: numTeams }, () => []);
    ordered.forEach((p, i) => {
      const round = Math.floor(i / numTeams);
      const idx = round % 2 === 0 ? i % numTeams : numTeams - 1 - (i % numTeams);
      if (buckets[idx].length < teamSize) buckets[idx].push(p.id);
    });
    return buckets.map((players, i) => ({ id: `g${i}`, name: teamLabels[i] || `Team ${i+1}`, players }));
  };

  const handleGenerate = () => {
    setGenerated(buildAutoTeams());
    setConfirmed(false);
  };

  const balanceMessage = (() => {
    if (balanceOrder.length === 0) return 'Teams generated randomly with no prioritization.';
    if (balanceOrder.length === 1 && balanceOrder[0] === 'sex') return 'Teams balanced by sex — males and females distributed evenly.';
    if (balanceOrder.length === 1 && balanceOrder[0] === 'level') return 'Teams balanced by skill level using a snake draft.';
    if (balanceOrder[0] === 'sex' && balanceOrder[1] === 'level') return 'Primary: balance sex across teams. Secondary: balance skill level within each sex group.';
    return 'Primary: balance skill level across teams. Secondary: balance sex within each level group.';
  })();

  const totalSteps = 4;

  return (
    <>
      <PageHeader
        title="New Tournament"
        sub={`Step ${step} of ${totalSteps}`}
        onBack={() => step > 1 ? setStep(step - 1) : router.pop()}
      />
      {/* Progress bar */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ height: 4, background: t.alt, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${(step/totalSteps)*100}%`, height: '100%',
            background: t.accent, transition: 'width 0.3s ease',
          }}/>
        </div>
      </div>

      <div className="route-enter" key={step} style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        {step === 1 && (
          <>
            <Label color={t.accent}>Name</Label>
            <div style={{
              background: t.surface, border: `1px solid ${t.line}`, borderRadius: 12,
              padding: '14px 16px', marginBottom: 16,
            }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Spring Cup 2026"
                style={{
                  width: '100%', border: 0, outline: 0, background: 'transparent',
                  color: t.text, fontSize: 15, fontWeight: 600,
                }}
              />
            </div>
            <Label color={t.accent}>Start date</Label>
            <Card style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Icons.calendar s={18} c={t.dim}/>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Apr 25</div>
            </Card>
            <Label color={t.accent}>Team size</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { v: 2, title: '2 players', sub: 'Doubles' },
                { v: 3, title: '3 players', sub: 'Triples' },
              ].map(o => (
                <Card key={o.v} onClick={() => setTeamSize(o.v)} border={teamSize === o.v ? t.accent : t.line} style={{
                  padding: '14px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: teamSize === o.v ? t.accent : t.text, lineHeight: 1 }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: t.dim, marginTop: 4 }}>{o.sub}</div>
                </Card>
              ))}
            </div>
            <Label color={t.accent}>Match length</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { v: 1, title: '1 set', sub: 'Quick play' },
                { v: 3, title: 'Best of 3', sub: 'Standard' },
              ].map(o => (
                <Card key={o.v} onClick={() => setSets(o.v)} border={sets === o.v ? t.accent : t.line} style={{
                  padding: '14px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: sets === o.v ? t.accent : t.text, lineHeight: 1 }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: t.dim, marginTop: 4 }}>{o.sub}</div>
                </Card>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <Label color={t.accent}>Players ({selected.length} selected)</Label>
            <div style={{ marginBottom: 14 }}>
              {PLAYERS.slice(0, 10).map(p => {
                const on = selected.includes(p.id);
                return (
                  <Card key={p.id} onClick={() => setSelected(on ? selected.filter(s => s !== p.id) : [...selected, p.id])}
                    border={on ? t.accent : t.line}
                    style={{ marginBottom: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar player={p} size={32}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: t.dim }}>ELO {p.elo}</div>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: on ? t.accent : 'transparent',
                      border: `1.5px solid ${on ? t.accent : t.line}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {on && <Icons.check s={14} c="#fff"/>}
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            {/* Mode tabs */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4,
              background: t.alt, border: `1px solid ${t.line}`, borderRadius: 12, marginBottom: 14,
            }}>
              {[
                { id: 'auto',   label: 'Auto generate' },
                { id: 'manual', label: 'Manual' },
              ].map(o => (
                <button key={o.id} onClick={() => { setTeams(o.id); setConfirmed(false); }} className="tap" style={{
                  padding: '10px 0', borderRadius: 8, border: 0,
                  background: teams === o.id ? t.surface : 'transparent',
                  color: teams === o.id ? t.text : t.dim,
                  fontSize: 13, fontWeight: 700,
                  boxShadow: teams === o.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}>{o.label}</button>
              ))}
            </div>

            {teams === 'auto' && (
              <>
                <Label color={t.accent}>Balance by · tap to set priority</Label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[
                    { id: 'sex',   label: 'Sex' },
                    { id: 'level', label: 'Level' },
                  ].map(opt => {
                    const idx = balanceOrder.indexOf(opt.id);
                    const on = idx >= 0;
                    return (
                      <button key={opt.id} onClick={() => toggleBalance(opt.id)} className="tap" style={{
                        flex: 1, padding: '12px 14px', borderRadius: 12,
                        background: on ? hexA(t.accent, 0.12) : t.surface,
                        border: `1.5px solid ${on ? t.accent : t.line}`,
                        color: on ? t.accent : t.text,
                        fontSize: 13, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                        {on && (
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: t.accent, color: '#fff',
                            fontSize: 10, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{idx + 1}</span>
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{
                  fontSize: 11, color: t.dim, lineHeight: 1.5,
                  padding: '10px 12px', background: t.alt, borderRadius: 10, marginBottom: 14,
                }}>
                  {balanceMessage}
                </div>

                <Btn variant={generated ? 'ghost' : 'primary'} onClick={handleGenerate} icon={<Icons.users s={16} c={generated ? t.text : '#fff'}/>}>
                  {generated ? 'Regenerate teams' : 'Generate teams'}
                </Btn>

                {generated && (
                  <>
                    <Label color={t.accent} style={{ marginTop: 18 }}>Preview · {generated.length} teams</Label>
                    {generated.map(team => (
                      <Card key={team.id} style={{ padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.accent, width: 60 }}>Team {team.name}</span>
                        <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {team.players.map(pid => <PlayerChip key={pid} player={PLAYERS.find(p => p.id === pid)}/>)}
                        </div>
                      </Card>
                    ))}
                    <div style={{ marginTop: 10 }}>
                      {confirmed ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '12px', borderRadius: 12,
                          background: hexA(t.ok, 0.12), border: `1.5px solid ${t.ok}`,
                          color: t.ok, fontSize: 13, fontWeight: 700,
                        }}>
                          <Icons.check s={16} c={t.ok}/> Teams confirmed
                        </div>
                      ) : (
                        <Btn onClick={() => setConfirmed(true)} icon={<Icons.check s={16} c="#fff"/>}>
                          Confirm teams
                        </Btn>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {teams === 'manual' && (
              <>
                {manualTeams.length === 0 && (
                  <div style={{
                    padding: '24px 16px', textAlign: 'center',
                    border: `1.5px dashed ${t.line}`, borderRadius: 12, marginBottom: 12,
                    color: t.dim, fontSize: 12,
                  }}>
                    No teams yet. Tap <strong style={{ color: t.text }}>Add team</strong> to start building.
                  </div>
                )}
                {manualTeams.map((team, ti) => {
                  const available = selected.filter(pid => !manualTeams.some(mt => mt.players.includes(pid)));
                  const full = team.players.length >= teamSize;
                  return (
                    <Card key={team.id} style={{ marginBottom: 10, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <input
                          value={team.name}
                          onChange={e => setManualTeams(mt => mt.map(x => x.id === team.id ? { ...x, name: e.target.value } : x))}
                          placeholder={`Team ${ti + 1}`}
                          style={{
                            flex: 1, border: 0, outline: 0, background: 'transparent',
                            color: t.text, fontSize: 14, fontWeight: 700,
                            borderBottom: `1px dashed ${t.line}`, padding: '2px 0',
                          }}
                        />
                        <span style={{ fontSize: 10, color: t.dim, fontWeight: 600 }}>{team.players.length}/{teamSize}</span>
                        <button onClick={() => setManualTeams(mt => mt.filter(x => x.id !== team.id))} className="tap" style={{
                          border: 0, background: 'transparent', padding: 4, color: t.dim, cursor: 'pointer',
                        }}><Icons.x s={16} c={t.dim}/></button>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: team.players.length ? 10 : 0 }}>
                        {team.players.map(pid => {
                          const p = PLAYERS.find(x => x.id === pid);
                          return (
                            <div key={pid} onClick={() => setManualTeams(mt => mt.map(x => x.id === team.id ? { ...x, players: x.players.filter(id => id !== pid) } : x))} style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '4px 8px 4px 4px', borderRadius: 999,
                              background: hexA(t.accent, 0.12), border: `1px solid ${hexA(t.accent, 0.3)}`,
                              cursor: 'pointer',
                            }}>
                              <Avatar player={p} size={20}/>
                              <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{p.short}</span>
                              <Icons.x s={12} c={t.dim}/>
                            </div>
                          );
                        })}
                      </div>
                      {!full && (
                        <>
                          {pickerForTeam === team.id ? (
                            <div style={{ borderTop: `1px solid ${t.line}`, paddingTop: 10, marginTop: 4 }}>
                              <div style={{ fontSize: 10, color: t.dim, marginBottom: 6, fontWeight: 600 }}>SELECT PLAYER</div>
                              {available.length === 0 ? (
                                <div style={{ fontSize: 11, color: t.dim, padding: '6px 0' }}>All invited players are assigned.</div>
                              ) : available.map(pid => {
                                const p = PLAYERS.find(x => x.id === pid);
                                return (
                                  <div key={pid} onClick={() => {
                                    setManualTeams(mt => mt.map(x => x.id === team.id ? { ...x, players: [...x.players, pid] } : x));
                                    setPickerForTeam(null);
                                  }} className="tap" style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                                  }}>
                                    <Avatar player={p} size={26}/>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{p.name}</div>
                                      <div style={{ fontSize: 10, color: t.dim }}>{p.level} · {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'X'}</div>
                                    </div>
                                  </div>
                                );
                              })}
                              <button onClick={() => setPickerForTeam(null)} className="tap" style={{
                                marginTop: 4, width: '100%', padding: '8px', border: 0,
                                background: 'transparent', color: t.dim, fontSize: 11, fontWeight: 600,
                              }}>Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setPickerForTeam(team.id)} className="tap" style={{
                              width: '100%', padding: '10px', borderRadius: 10,
                              background: 'transparent', border: `1px dashed ${t.line}`,
                              color: t.dim, fontSize: 12, fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                            }}><Icons.plus s={14} c={t.dim}/> Add player</button>
                          )}
                        </>
                      )}
                    </Card>
                  );
                })}
                <Btn variant="ghost" icon={<Icons.plus s={16} c={t.text}/>} onClick={() => {
                  setManualTeams(mt => [...mt, { id: `m${Date.now()}`, name: '', players: [] }]);
                }}>Add team</Btn>
              </>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <Label color={t.accent}>Review</Label>
            <Card style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}>
              {[
                ['Name', name || 'Spring Cup 2026'],
                ['Starts', 'Apr 25'],
                ['Team size', teamSize === 2 ? 'Doubles (2)' : 'Triples (3)'],
                ['Match', sets === 1 ? '1 set' : 'Best of 3'],
                ['Players', `${selected.length} invited`],
                ['Teams', teams === 'auto' ? 'Auto by ELO' : teams === 'manual' ? 'Manual pairs' : 'Random'],
                ['Court', 'South Pointe · 3 courts'],
              ].map(([k,v], i, arr) => (
                <div key={k} style={{
                  display: 'flex', padding: '12px 14px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${t.line}` : 'none',
                }}>
                  <span style={{ flex: 1, fontSize: 12, color: t.dim }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{v}</span>
                </div>
              ))}
            </Card>
            <div style={{ fontSize: 11, color: t.dim, textAlign: 'center', padding: '10px 0 14px' }}>
              🏐 Ready to serve. Invitations will go out immediately.
            </div>
          </>
        )}
      </div>

      <div style={{ padding: 14, borderTop: `1px solid ${t.line}`, background: t.surface, flexShrink: 0 }}>
        <Btn onClick={() => step < totalSteps ? setStep(step + 1) : router.replace('tournament')}>
          {step < totalSteps ? 'Continue' : '🏐 Launch Tournament'}
        </Btn>
      </div>
    </>
  );
}

Object.assign(window, { TournamentScreen, TournamentSetup });
