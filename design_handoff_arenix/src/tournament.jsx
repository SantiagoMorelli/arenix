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
  const [format, setFormat] = useState('round');
  const [teams, setTeams] = useState('auto');

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
            <Label color={t.accent}>Dates</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <Card style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.calendar s={18} c={t.dim}/>
                <div>
                  <div style={{ fontSize: 10, color: t.dim }}>Start</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Apr 25</div>
                </div>
              </Card>
              <Card style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.calendar s={18} c={t.dim}/>
                <div>
                  <div style={{ fontSize: 10, color: t.dim }}>End</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>May 2</div>
                </div>
              </Card>
            </div>
            <Label color={t.accent}>Format</Label>
            {[
              { id: 'round', title: 'Round robin', sub: 'Everyone plays everyone' },
              { id: 'group', title: 'Group stage + Knockout', sub: 'Groups → bracket playoff' },
              { id: 'knock', title: 'Single elimination', sub: 'Bracket from start' },
            ].map(f => (
              <Card key={f.id} onClick={() => setFormat(f.id)} border={format === f.id ? t.accent : t.line} style={{
                marginBottom: 8, padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${format === f.id ? t.accent : t.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {format === f.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.accent }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: t.dim }}>{f.sub}</div>
                </div>
              </Card>
            ))}
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
            <Label color={t.accent}>Team building</Label>
            {[
              { id: 'auto', title: 'Auto-balance by ELO', sub: 'Even teams by rating' },
              { id: 'manual', title: 'Manually pick pairs', sub: "You'll drag-match players" },
              { id: 'random', title: 'Random', sub: 'Fortune favors the bold' },
            ].map(f => (
              <Card key={f.id} onClick={() => setTeams(f.id)} border={teams === f.id ? t.accent : t.line} style={{
                marginBottom: 8, padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${teams === f.id ? t.accent : t.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {teams === f.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.accent }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: t.dim }}>{f.sub}</div>
                </div>
              </Card>
            ))}
            <Label color={t.accent} style={{ marginTop: 18 }}>Preview · 4 teams</Label>
            {TOURNAMENT.teams.map(team => {
              const p1 = PLAYERS.find(p => p.id === team.players[0]);
              const p2 = PLAYERS.find(p => p.id === team.players[1]);
              return (
                <Card key={team.id} style={{ padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.accent, width: 60 }}>Team {team.name}</span>
                  <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                    <PlayerChip player={p1}/>
                    <PlayerChip player={p2}/>
                  </div>
                </Card>
              );
            })}
          </>
        )}
        {step === 4 && (
          <>
            <Label color={t.accent}>Review</Label>
            <Card style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}>
              {[
                ['Name', name || 'Spring Cup 2026'],
                ['Dates', 'Apr 25 – May 2'],
                ['Format', format === 'round' ? 'Round robin' : format === 'group' ? 'Groups + Knockout' : 'Single elim.'],
                ['Players', `${selected.length} invited`],
                ['Teams', teams === 'auto' ? 'Auto by ELO' : teams === 'manual' ? 'Manual pairs' : 'Random'],
                ['Court', 'South Pointe · 3 courts'],
              ].map(([k,v], i) => (
                <div key={k} style={{
                  display: 'flex', padding: '12px 14px',
                  borderBottom: i < 5 ? `1px solid ${t.line}` : 'none',
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
