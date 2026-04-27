// Live match flow: setup → scoreboard → point modals → result
function LiveMatchFlow() {
  const t = useTheme();
  const router = useRouter();
  const [phase, setPhase] = useState('scoreboard'); // setup | scoreboard | result
  const [sheet, setSheet] = useState(null); // 'type' | 'who'
  const [pointTeam, setPointTeam] = useState(null);

  const [log, setLog] = useState(POINT_LOG_SEED);
  const [scoreA, setScoreA] = useState(12);
  const [scoreB, setScoreB] = useState(9);
  const [serving, setServing] = useState('A');
  const [setsA, setSetsA] = useState(1);
  const [setsB, setSetsB] = useState(0);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1400); };

  const addPoint = (team, type = 'err', scorer = null) => {
    const newA = team === 'A' ? scoreA + 1 : scoreA;
    const newB = team === 'B' ? scoreB + 1 : scoreB;
    setScoreA(newA); setScoreB(newB);
    setServing(team);
    const name = scorer || { spike: 'Carlos M.', ace: 'Ana P.', block: 'Santi A.', tip: 'Carlos M.', err: null }[type];
    setLog([{
      score: [newA, newB],
      event: type === 'err' ? 'Rival error' : `${type[0].toUpperCase()+type.slice(1)} by ${name || '—'}`,
      team, scorer: name, serverName: team === 'A' ? 'Ana P.' : 'Santi A.', type,
    }, ...log]);
    showToast(team === 'A' ? 'Alpha +1' : 'Bravo +1');
    if (newA >= 21 || newB >= 21) { setTimeout(() => setPhase('result'), 800); }
  };

  const undo = () => {
    if (log.length <= 1) return;
    const [,...rest] = log;
    const prev = rest[0];
    setScoreA(prev.score[0]); setScoreB(prev.score[1]);
    setLog(rest);
    showToast('Undone');
  };

  return (
    <>
      {phase === 'setup' && <MatchSetup onStart={() => setPhase('scoreboard')} onBack={() => router.pop()}/>}
      {phase === 'scoreboard' && (
        <Scoreboard
          scoreA={scoreA} scoreB={scoreB} setsA={setsA} setsB={setsB}
          serving={serving} log={log}
          onPoint={(team) => { setPointTeam(team); setSheet('type'); }}
          onUndo={undo}
          onEnd={() => setPhase('result')}
          onBack={() => router.pop()}
        />
      )}
      {phase === 'result' && <MatchResult onDone={() => router.replace('tournament')}/>}

      <Sheet open={sheet === 'type'} onClose={() => setSheet(null)}>
        <PointTypeSheet
          team={pointTeam}
          onPick={(type) => {
            if (type === 'err') { addPoint(pointTeam, 'err'); setSheet(null); }
            else { setSheet('who'); sessionStorage._pt = type; }
          }}
        />
      </Sheet>
      <Sheet open={sheet === 'who'} onClose={() => setSheet(null)}>
        <WhoScoredSheet
          team={pointTeam}
          onPick={(scorer) => { addPoint(pointTeam, sessionStorage._pt || 'spike', scorer); setSheet(null); }}
        />
      </Sheet>
      <Toast message={toast}/>
    </>
  );
}

function MatchSetup({ onStart, onBack }) {
  const t = useTheme();
  const [sets, setSets] = useState('bo3');
  const [first, setFirst] = useState('A');
  return (
    <>
      <PageHeader title="Match Setup" sub="Spring Cup · Day 2" onBack={onBack}/>
      <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        <Card style={{ padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>Team Alpha</div>
            <div style={{ fontSize: 10, color: t.dim }}>Carlos M. · Ana P.</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.dim, background: t.alt, padding: '3px 8px', borderRadius: 6 }}>VS</span>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.free }}>Team Bravo</div>
            <div style={{ fontSize: 10, color: t.dim }}>Santi A. · Diego R.</div>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['Alpha', 'Bravo'].map((nm, i) => {
            const c = i === 0 ? t.accent : t.free;
            const cSoft = i === 0 ? t.accentSoft : t.freeSoft;
            const players = i === 0 ? ['Carlos M.','Ana P.'] : ['Santi A.','Diego R.'];
            return (
              <Card key={nm} style={{ flex: 1, padding: 12 }}>
                <Label color={c} style={{ marginBottom: 8, fontSize: 10 }}>{nm} Order</Label>
                {players.map((p, idx) => (
                  <div key={p} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 8px', marginBottom: 4,
                    background: idx === 0 ? cSoft : 'transparent',
                    borderRadius: 8,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: c, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700,
                    }}>{idx+1}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{p}</span>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>

        <Label>First serve</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[{ id: 'A', nm: 'Alpha', c: t.accent, cs: t.accentSoft },
            { id: 'B', nm: 'Bravo', c: t.free,   cs: t.freeSoft }].map(x => {
            const on = first === x.id;
            return (
              <button key={x.id} onClick={() => setFirst(x.id)} className="tap" style={{
                flex: 1, padding: '12px 0', borderRadius: 10,
                background: on ? x.cs : 'transparent',
                color: on ? x.c : t.dim,
                border: `1px solid ${on ? x.c : t.line}`,
                fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>🏐 {x.nm}</button>
            );
          })}
        </div>

        <Label>Sets per match</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { id: 'single', nm: '1 set' },
            { id: 'bo3',    nm: 'Best of 3' },
            { id: 'bo5',    nm: 'Best of 5' },
          ].map(x => {
            const on = sets === x.id;
            return (
              <button key={x.id} onClick={() => setSets(x.id)} className="tap" style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: on ? t.accent : 'transparent',
                color: on ? '#fff' : t.dim,
                border: `1px solid ${on ? t.accent : t.line}`,
                fontSize: 12, fontWeight: 700,
              }}>{x.nm}</button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: 14, borderTop: `1px solid ${t.line}`, background: t.surface, flexShrink: 0 }}>
        <Btn onClick={onStart} color={t.ok}>🏐 Start Match</Btn>
      </div>
    </>
  );
}

function Scoreboard({ scoreA, scoreB, setsA, setsB, serving, log, onPoint, onUndo, onEnd, onBack }) {
  const t = useTheme();
  const variant = window.TWEAKS?.scoreVariant || 'broadcast';

  return (
    <>
      <PageHeader title="Alpha vs Bravo" sub="Spring Cup · Set 2" onBack={onBack} badge="LIVE" badgeColor={t.ok}/>
      <div className="route-enter" style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        <div style={{ display: 'inline-flex', gap: 6, marginBottom: 10, background: t.alt, borderRadius: 8, padding: '5px 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.dim }}>Set 2 · to 21 · Serving</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: serving === 'A' ? t.accent : t.free }}>{serving === 'A' ? 'Alpha' : 'Bravo'}</span>
        </div>

        {/* Broadcast-style scoreboard */}
        <div style={{
          background: t.scoreBg, borderRadius: 18, padding: '22px 16px 18px',
          marginBottom: 14, position: 'relative', overflow: 'hidden',
        }}>
          {/* court pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.08,
            backgroundImage: `repeating-linear-gradient(45deg, ${t.accent} 0 1px, transparent 1px 12px)`,
          }}/>
          <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative', zIndex: 1 }}>
            <TeamSide
              side="A" name="Team Alpha" players="Carlos · Ana" color={t.accent}
              score={scoreA} sets={setsA} serving={serving === 'A'}
              serverName="Carlos M."
            />
            <div style={{ width: 1, background: hexA('#ffffff', 0.08), margin: '0 4px' }}/>
            <TeamSide
              side="B" name="Team Bravo" players="Santi · Diego" color={t.free}
              score={scoreB} sets={setsB} serving={serving === 'B'}
              serverName="Santi A."
            />
          </div>
        </div>

        {/* +1 buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Btn onClick={() => onPoint('A')} color={t.accent} style={{ flex: 1 }}>+1 Alpha</Btn>
          <Btn onClick={() => onPoint('B')} color={t.free} style={{ flex: 1 }}>+1 Bravo</Btn>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Btn onClick={onUndo} variant="surface" icon={<Icons.undo s={16}/>} small style={{ flex: 1 }}>Undo</Btn>
          <Btn onClick={onEnd} color={t.err} small style={{ flex: 1 }}>End Match</Btn>
        </div>

        <Label color={t.accent}>History</Label>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {log.slice(0, 6).map((h, i) => (
            <div key={i} style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: i < Math.min(log.length, 6) - 1 ? `1px solid ${t.line}` : 'none',
            }}>
              <span className="display" style={{ fontSize: 16, color: t.accent, width: 42, lineHeight: 1 }}>
                {h.score[0]}-{h.score[1]}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: t.text }}>{h.event}</div>
                <div style={{ fontSize: 9, color: t.dim }}>🏐 {h.serverName}</div>
              </div>
              <Badge color={h.team === 'A' ? t.accent : t.free}>{h.team === 'A' ? 'Alpha' : 'Bravo'}</Badge>
            </div>
          ))}
        </Card>
        <div style={{ height: 10 }}/>
      </div>
    </>
  );
}

function TeamSide({ name, players, color, score, sets, serving, serverName }) {
  const t = useTheme();
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '0 4px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#E8ECF1', marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 9, color: '#7A8EA0', marginBottom: 8 }}>{players}</div>
      <div className="display" style={{
        fontSize: 64, lineHeight: 0.9,
        color: serving ? color : '#E8ECF1',
        textShadow: serving ? `0 0 24px ${hexA(color, 0.4)}` : 'none',
      }}>{score}</div>
      <div style={{ fontSize: 9, color: '#7A8EA0', marginTop: 4 }}>Sets: {sets}</div>
      {serving && (
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
          background: hexA(color, 0.2), borderRadius: 8, padding: '4px 10px', marginTop: 8,
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color, letterSpacing: 0.8 }}>🏐 SERVING</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#E8ECF1' }}>{serverName}</span>
        </div>
      )}
    </div>
  );
}

function PointTypeSheet({ team, onPick }) {
  const t = useTheme();
  const c = team === 'A' ? t.accent : t.free;
  return (
    <>
      <div style={{
        background: hexA(c, 0.15), borderRadius: 10,
        padding: '10px 0', textAlign: 'center', marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: t.dim, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Point for</div>
        <div className="display" style={{ fontSize: 22, color: c, lineHeight: 1 }}>{team === 'A' ? 'Team Alpha' : 'Team Bravo'}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, textAlign: 'center', marginBottom: 12 }}>How was the point won?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        {[
          { id: 'ace',   emoji: '🎯', name: 'Ace',   sub: 'Serve ace' },
          { id: 'spike', emoji: '💥', name: 'Spike', sub: 'Attack winner' },
          { id: 'block', emoji: '🛡️', name: 'Block', sub: 'Net block' },
          { id: 'tip',   emoji: '🤏', name: 'Tip',   sub: 'Tip/dink shot' },
        ].map(p => (
          <Card key={p.id} onClick={() => onPick(p.id)} style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{p.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{p.name}</div>
            <div style={{ fontSize: 10, color: t.dim }}>{p.sub}</div>
          </Card>
        ))}
      </div>
      <Card border={hexA(t.err, 0.3)} onClick={() => onPick('err')} style={{
        background: t.errSoft, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
      }}>
        <span style={{ fontSize: 22 }}>❌</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.err }}>Rival error</div>
          <div style={{ fontSize: 10, color: t.dim }}>The opponent made the mistake</div>
        </div>
      </Card>
    </>
  );
}

function WhoScoredSheet({ team, onPick }) {
  const t = useTheme();
  const c = team === 'A' ? t.accent : t.free;
  const players = team === 'A' ? [PLAYERS[0], PLAYERS[1]] : [PLAYERS[2], PLAYERS[3]];
  return (
    <>
      <div style={{
        background: hexA(c, 0.15), borderRadius: 10,
        padding: '10px 0', textAlign: 'center', marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: t.dim, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Point for</div>
        <div className="display" style={{ fontSize: 22, color: c, lineHeight: 1 }}>{team === 'A' ? 'Team Alpha' : 'Team Bravo'}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, textAlign: 'center', marginBottom: 12 }}>Who scored?</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {players.map(p => (
          <Card key={p.id} onClick={() => onPick(p.short)} style={{ flex: 1, padding: '16px 10px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Avatar player={p} size={44}/>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{p.name}</div>
          </Card>
        ))}
      </div>
      <Btn variant="surface" onClick={() => onPick(null)}>Skip</Btn>
    </>
  );
}

function MatchResult({ onDone }) {
  const t = useTheme();
  return (
    <>
      <PageHeader title="Match Result" sub="Spring Cup · Alpha def. Bravo" onBack={onDone}/>
      <div className="route-enter" style={{ flex: 1, padding: '0 16px 20px', overflowY: 'auto' }}>
        <div className="pop-enter" style={{
          background: `linear-gradient(160deg, ${hexA(t.accent, 0.18)}, ${t.surface})`,
          borderRadius: 18, padding: 22, textAlign: 'center',
          border: `1px solid ${t.accentLine}`, marginBottom: 16, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: 34, marginBottom: 4 }}>🏆</div>
          <Label color={t.accent} style={{ justifyContent: 'center', marginBottom: 6 }}>Winner</Label>
          <div className="display" style={{ fontSize: 30, color: t.accent, lineHeight: 1, marginBottom: 14 }}>Team Alpha</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: t.dim }}>Alpha</div>
              <div className="display" style={{ fontSize: 40, color: t.accent, lineHeight: 1 }}>2</div>
            </div>
            <div style={{ fontSize: 12, color: t.dim }}>—</div>
            <div>
              <div style={{ fontSize: 10, color: t.dim }}>Bravo</div>
              <div className="display" style={{ fontSize: 40, color: t.dim, lineHeight: 1 }}>1</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: t.dim, marginTop: 10 }}>21-18 · 19-21 · 21-17</div>
        </div>

        <Label color={t.accent}>Points by type</Label>
        <Card style={{ padding: 14, marginBottom: 14 }}>
          {[
            { label: 'Spikes',  a: 9,  b: 6 },
            { label: 'Aces',    a: 4,  b: 3 },
            { label: 'Blocks',  a: 3,  b: 5 },
            { label: 'Tips',    a: 2,  b: 1 },
            { label: 'Rival errors', a: 7, b: 6 },
          ].map((r, i) => {
            const total = r.a + r.b;
            const aPct = (r.a/total) * 100;
            return (
              <div key={r.label} style={{ marginBottom: i < 4 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.dim, marginBottom: 4 }}>
                  <span className="display" style={{ fontSize: 16, color: t.accent, lineHeight: 1 }}>{r.a}</span>
                  <span>{r.label}</span>
                  <span className="display" style={{ fontSize: 16, color: t.free, lineHeight: 1 }}>{r.b}</span>
                </div>
                <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', background: t.alt }}>
                  <div style={{ width: aPct + '%', background: t.accent }}/>
                  <div style={{ width: (100-aPct) + '%', background: t.free }}/>
                </div>
              </div>
            );
          })}
        </Card>

        <Label color={t.accent}>Top performers</Label>
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          {[
            { p: PLAYERS[0], stat: '11 kills' },
            { p: PLAYERS[1], stat: '4 aces' },
            { p: PLAYERS[2], stat: '5 blocks' },
          ].map((x, i) => (
            <div key={x.p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px',
              borderBottom: i < 2 ? `1px solid ${t.line}` : 'none',
            }}>
              <Avatar player={x.p} size={34}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{x.p.name}</div>
                <div style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>{x.stat}</div>
              </div>
              <Icons.flame s={18} c={t.accent}/>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ padding: 14, borderTop: `1px solid ${t.line}`, background: t.surface, display: 'flex', gap: 8, flexShrink: 0 }}>
        <Btn variant="surface" icon={<Icons.share s={16}/>} style={{ flex: 1 }}>Share</Btn>
        <Btn onClick={onDone} style={{ flex: 2 }}>Done</Btn>
      </div>
    </>
  );
}

Object.assign(window, { LiveMatchFlow });
