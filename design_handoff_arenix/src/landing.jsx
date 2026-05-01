// Landing screen — works for both logged-out (public landing) and logged-in users.
// Logged-out: brand bar with Log in / Sign up CTAs.
// Logged-in: avatar + notifications, plus a Free Play sessions section above public leagues.

function PublicLandingScreen() {
  const t = useTheme();
  const router = useRouter();
  const isLoggedIn = (window.TWEAKS?.auth || 'loggedOut') === 'loggedIn';
  const me = PLAYERS[2]; // Santi
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'live' | 'open'
  const [authSheet, setAuthSheet] = useState(null);

  function openTournament(tr, league) {
    router.push('league');
    setTimeout(() => router.push('tournament'), 0);
  }

  // Flatten all tournaments across public leagues
  const allTourneys = useMemo(() =>
    PUBLIC_LEAGUES.flatMap(L => L.tournaments.map(tr => ({ ...tr, league: L }))),
  []);
  const liveCount = allTourneys.filter(x => x.status === 'LIVE').length;
  const openCount = allTourneys.filter(x => x.status === 'OPEN').length;

  // Filter leagues + their tournaments by search + status
  const visibleLeagues = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PUBLIC_LEAGUES.map(L => {
      let trs = L.tournaments;
      if (filter === 'live') trs = trs.filter(x => x.status === 'LIVE');
      if (filter === 'open') trs = trs.filter(x => x.status === 'OPEN');
      if (q) {
        const leagueMatch = L.name.toLowerCase().includes(q) || L.city.toLowerCase().includes(q);
        if (!leagueMatch) trs = trs.filter(x => x.name.toLowerCase().includes(q));
      }
      return { ...L, tournaments: trs };
    }).filter(L => L.tournaments.length || (filter === 'all' && !query))
      .slice(0, 1); // Show only one league on landing
  }, [query, filter]);

  return (
    <>
      <div className="route-enter" style={{ flex: 1, overflowY: 'auto' }}>
        {/* ── Brand bar + auth CTAs ────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LandingMark size={26} accent={t.accent}/>
            <span className="display" style={{
              fontSize: 22, color: t.text, letterSpacing: 1.5, lineHeight: 1,
            }}>ARENIX</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {isLoggedIn ? (
              <>
                <IconBtn onClick={() => router.push('notifications')} badge={3}><Icons.bell s={18}/></IconBtn>
                <button onClick={() => router.push('profile')} className="tap" style={{
                  padding: 0, borderRadius: 12,
                }}>
                  <Avatar player={me} size={38}/>
                </button>
              </>
            ) : (
              <>
                <button className="tap" onClick={() => setAuthSheet('login')} style={{
                  padding: '8px 12px', borderRadius: 10,
                  fontSize: 12, fontWeight: 700, color: t.text,
                  background: 'transparent',
                }}>Log in</button>
                <button className="tap" onClick={() => setAuthSheet('signup')} style={{
                  padding: '8px 14px', borderRadius: 10,
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  background: t.accent,
                }}>Sign up</button>
              </>
            )}
          </div>
        </div>

        {/* ── Hero ────────────────────────────────── */}
        <div style={{ padding: '4px 16px 16px' }}>
          <div className="display" style={{
            fontSize: 32, lineHeight: 1.05, color: t.text,
            letterSpacing: 0.5, marginBottom: 8,
          }}>
            {isLoggedIn ? <>WELCOME BACK,<br/><span style={{ color: t.accent }}>{me.nickname.toUpperCase()}.</span></> : <>BEACH VOLLEY,<br/><span style={{ color: t.accent }}>SCORED LIVE.</span></>}
          </div>
          <div style={{ fontSize: 12.5, color: t.dim, lineHeight: 1.5 }}>
            {isLoggedIn ? 'Jump back in, or browse open tournaments near you.' : 'Browse public leagues and open tournaments — no account needed.'}
          </div>
        </div>

        {/* ── Search + filter chips ───────────────── */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: t.surface, border: `1px solid ${t.line}`,
            borderRadius: 12, padding: '10px 12px', marginBottom: 10,
          }}>
            <SearchGlyph c={t.dim} s={15}/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search leagues, cities, tournaments…"
              style={{
                flex: 1, border: 0, background: 'transparent',
                color: t.text, fontSize: 13, fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="tap" style={{
                color: t.dim, padding: 2,
              }}><Icons.x s={14}/></button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <FilterChip on={filter === 'all'}  onClick={() => setFilter('all')}>
              All <Count c={t.dim}>{allTourneys.length}</Count>
            </FilterChip>
            <FilterChip on={filter === 'live'} onClick={() => setFilter('live')} dot={t.ok}>
              Live <Count c={t.ok}>{liveCount}</Count>
            </FilterChip>
            <FilterChip on={filter === 'open'} onClick={() => setFilter('open')}>
              Open <Count c={t.accent}>{openCount}</Count>
            </FilterChip>
          </div>
        </div>

        {/* ── Public leagues list ─────────────────── */}
        <div style={{ padding: '8px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label color={t.accent} style={{ marginBottom: 0 }}>
            Featured league
          </Label>
          <span style={{ fontSize: 10, color: t.dim, letterSpacing: 0.4 }}>
            {PUBLIC_LEAGUES.length} total · worldwide
          </span>
        </div>

        <div style={{ padding: '8px 16px 18px' }}>
          {visibleLeagues.length === 0 ? (
            <EmptyState query={query}/>
          ) : (
            visibleLeagues.map(L => (
              <PublicLeagueCard
                key={L.id} league={L}
                onJoinTourney={(tr) => openTournament(tr, L)}
              />
            ))
          )}
        </div>

        {/* ── Footer login nudge (logged-out only) ─ */}
        {!isLoggedIn && <div style={{ padding: '0 16px 24px' }}>
          <Card style={{
            padding: 16, textAlign: 'center',
            background: `linear-gradient(135deg, ${t.accentSoft}, ${t.surface})`,
            border: `1px solid ${t.accentLine}`,
          }}>
            <div className="display" style={{ fontSize: 18, color: t.text, lineHeight: 1.1, marginBottom: 4 }}>
              Ready to play?
            </div>
            <div style={{ fontSize: 11.5, color: t.dim, marginBottom: 12, lineHeight: 1.5 }}>
              Create an account to join tournaments, track your ELO and follow your league.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" small onClick={() => setAuthSheet('login')} style={{ flex: 1 }}>
                Log in
              </Btn>
              <Btn variant="primary" small onClick={() => setAuthSheet('signup')} style={{ flex: 1 }}>
                Create account
              </Btn>
            </div>
          </Card>
          <div style={{
            textAlign: 'center', fontSize: 10, color: t.dim,
            marginTop: 14, letterSpacing: 0.5,
          }}>
            Arenix · Beach volley, anywhere
          </div>
        </div>}

        {/* ── Free Play sessions (logged-in only, below leagues) ── */}
        {isLoggedIn && <FreePlaySection/>}

        {/* ── Logged-in footer breathing room ─────── */}
        {isLoggedIn && <div style={{ height: 24 }}/>}
      </div>

      <AuthSheet
        sheet={authSheet}
        onClose={() => setAuthSheet(null)}
        onSwitch={(kind) => setAuthSheet(kind)}
      />
    </>
  );
}

// ── League card with expandable tournament list ──────────
function PublicLeagueCard({ league, onJoinTourney }) {
  const t = useTheme();
  const [open, setOpen] = useState(true);
  const live = league.tournaments.find(tr => tr.status === 'LIVE');

  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    }}>
      {/* League header — tap to collapse */}
      <button onClick={() => setOpen(o => !o)} className="tap" style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `oklch(0.55 0.15 ${league.hue})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icons.trophy s={20} c="#fff"/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: t.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{league.name}</span>
            {league.verified && <VerifiedBadge c={t.accent}/>}
          </div>
          <div style={{ fontSize: 11, color: t.dim, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icons.map s={11} c={t.dim}/>
            <span>{league.city}</span>
            <span>·</span>
            <span>{league.playerCount} players</span>
          </div>
        </div>
        {live ? (
          <Badge color={t.ok} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="dot-pulse" style={{
              width: 6, height: 6, borderRadius: '50%', background: t.ok, color: t.ok,
            }}/>
            Live
          </Badge>
        ) : (
          <span style={{ color: t.dim, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
            <Icons.chevR s={16} c={t.dim}/>
          </span>
        )}
      </button>

      {/* Tournaments */}
      {open && league.tournaments.length > 0 && (
        <div style={{ borderTop: `1px solid ${t.line}`, padding: '8px 10px 10px' }}>
          {league.tournaments.map(tr => (
            <TournamentRow key={tr.id} tr={tr} onClick={() => onJoinTourney(tr)}/>
          ))}
        </div>
      )}
      {open && league.tournaments.length === 0 && (
        <div style={{
          borderTop: `1px solid ${t.line}`,
          padding: '14px', fontSize: 11, color: t.dim, textAlign: 'center',
        }}>
          No tournaments matching this filter
        </div>
      )}
    </div>
  );
}

function TournamentRow({ tr, onClick }) {
  const t = useTheme();
  const isLive = tr.status === 'LIVE';
  const ringColor = isLive ? t.ok : t.accent;
  const softBg    = isLive ? hexA(t.ok, 0.12) : hexA(t.accent, 0.10);
  return (
    <button onClick={onClick} className="tap" style={{
      width: '100%', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 8px', borderRadius: 10,
      background: 'transparent',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: softBg, color: ringColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isLive
          ? <Icons.play s={16} c={ringColor}/>
          : <Icons.calendar s={16} c={ringColor}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: t.text,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tr.name}
          </span>
          {tr.prize && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: t.accent,
              background: t.accentSoft, padding: '2px 6px', borderRadius: 5,
              letterSpacing: 0.4,
            }}>{tr.prize}</span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: t.dim, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{tr.date}</span>
          <span>·</span>
          <span>{tr.teams} teams</span>
          {tr.spotsLeft != null && (
            <>
              <span>·</span>
              <span style={{ color: tr.spotsLeft <= 3 ? t.accent : t.dim, fontWeight: 600 }}>
                {tr.spotsLeft} spots left
              </span>
            </>
          )}
        </div>
      </div>
      {isLive ? (
        <span style={{
          fontSize: 10, fontWeight: 700, color: t.ok,
          background: hexA(t.ok, 0.15), padding: '5px 9px', borderRadius: 6,
          letterSpacing: 0.4, display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <span className="dot-pulse" style={{
            width: 5, height: 5, borderRadius: '50%', background: t.ok, color: t.ok,
          }}/>
          LIVE
        </span>
      ) : (
        <span style={{
          fontSize: 10, fontWeight: 700, color: t.accent,
          background: t.accentSoft, padding: '5px 9px', borderRadius: 6,
          letterSpacing: 0.4,
        }}>JOIN</span>
      )}
    </button>
  );
}

// ── Filter chip ─────────────────────────────
function FilterChip({ children, on, onClick, dot }) {
  const t = useTheme();
  return (
    <button onClick={onClick} className="tap" style={{
      flex: 1, padding: '8px 10px', borderRadius: 10,
      background: on ? t.accent : t.surface,
      color: on ? '#fff' : t.text,
      border: `1px solid ${on ? t.accent : t.line}`,
      fontSize: 11.5, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      {dot && !on && <span className="dot-pulse" style={{
        width: 6, height: 6, borderRadius: '50%', background: dot, color: dot,
      }}/>}
      {children}
    </button>
  );
}

function Count({ children, c }) {
  return <span style={{
    fontSize: 10, fontWeight: 700, opacity: 0.85,
    color: 'currentColor',
  }}>{children}</span>;
}

function VerifiedBadge({ c }) {
  return (
    <span title="Verified league" style={{
      width: 14, height: 14, borderRadius: '50%',
      background: c, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </span>
  );
}

// Sun-and-net wordmark
function LandingMark({ size = 26, accent }) {
  const t = useTheme();
  const c = accent || t.accent;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill={hexA(c, 0.18)}/>
      <circle cx="16" cy="16" r="9" fill="none" stroke={c} strokeWidth="1.6"/>
      <path d="M7 16 Q 16 6 25 16" stroke={c} strokeWidth="1.6" fill="none"/>
      <path d="M7 16 Q 16 26 25 16" stroke={c} strokeWidth="1.6" fill="none"/>
      <line x1="16" y1="7" x2="16" y2="25" stroke={c} strokeWidth="1.6"/>
    </svg>
  );
}

function SearchGlyph({ s = 16, c = '#999' }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.5" y2="16.5"/>
    </svg>
  );
}

function EmptyState({ query }) {
  const t = useTheme();
  return (
    <div style={{
      padding: '36px 20px', textAlign: 'center',
      background: t.surface, border: `1px dashed ${t.line}`,
      borderRadius: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 24,
        background: t.alt, color: t.dim,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
      }}>
        <SearchGlyph s={22} c={t.dim}/>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>
        Nothing found{query ? ` for "${query}"` : ''}
      </div>
      <div style={{ fontSize: 11.5, color: t.dim, lineHeight: 1.5 }}>
        Try another city, league name, or clear the filter.
      </div>
    </div>
  );
}

// ── Auth / Join sheet ───────────────────────
function AuthSheet({ sheet, onClose, onSwitch }) {
  const t = useTheme();
  if (!sheet) return null;

  const isJoin   = typeof sheet === 'object' && sheet.kind === 'join';
  const isSignup = sheet === 'signup';
  const isLogin  = sheet === 'login';

  let title, sub, primary, secondary, headerIcon, headerColor;
  if (isJoin) {
    title = `Join ${sheet.tourney.name}`;
    sub = `${sheet.league.name} · ${sheet.tourney.date}`;
    primary = 'Create account & join';
    secondary = 'Already have an account? Log in';
    headerIcon = <Icons.trophy s={22} c={t.accent}/>;
    headerColor = t.accent;
  } else if (isSignup) {
    title = 'Create your account';
    sub = 'Track your ELO, join leagues, score live matches.';
    primary = 'Sign up';
    secondary = 'Already have an account? Log in';
    headerIcon = <Icons.star s={22} c={t.accent}/>;
    headerColor = t.accent;
  } else {
    title = 'Welcome back';
    sub = 'Log in to your Arenix account';
    primary = 'Log in';
    secondary = "Don't have an account? Sign up";
    headerIcon = <Icons.users s={22} c={t.accent}/>;
    headerColor = t.accent;
  }

  return (
    <Sheet open={!!sheet} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: hexA(headerColor, 0.14), color: headerColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{headerIcon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{title}</div>
          <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>{sub}</div>
        </div>
        <button className="tap" onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 16, background: t.alt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icons.close s={14} c={t.dim}/></button>
      </div>

      {isJoin && (
        <div style={{
          background: hexA(t.accent, 0.08), border: `1px solid ${t.accentLine}`,
          borderRadius: 12, padding: '10px 12px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icons.calendar s={16} c={t.accent}/>
          <div style={{ flex: 1, fontSize: 11.5, color: t.text, lineHeight: 1.4 }}>
            <b>{sheet.tourney.teams} teams</b> · {sheet.tourney.date}
            {sheet.tourney.spotsLeft != null && <> · <span style={{ color: t.accent, fontWeight: 700 }}>{sheet.tourney.spotsLeft} spots left</span></>}
          </div>
        </div>
      )}

      {/* Form scaffold */}
      <div style={{
        background: t.surface, border: `1px solid ${t.line}`,
        borderRadius: 12, padding: 12, marginBottom: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {(isSignup || isJoin) && (
          <div>
            <div style={authLabelStyle(t)}>Full name</div>
            <input placeholder="e.g. Carlos Mendez" style={authInputStyle(t)}/>
          </div>
        )}
        <div>
          <div style={authLabelStyle(t)}>Email</div>
          <input type="email" placeholder="you@example.com" style={authInputStyle(t)}/>
        </div>
        <div>
          <div style={authLabelStyle(t)}>Password</div>
          <input type="password" placeholder="••••••••" style={authInputStyle(t)}/>
        </div>
      </div>

      <Btn variant="primary" onClick={onClose}>{primary}</Btn>
      <button className="tap" onClick={() => onSwitch(isLogin ? 'signup' : 'login')} style={{
        display: 'block', width: '100%', textAlign: 'center',
        marginTop: 12, padding: '4px 0',
        fontSize: 12, fontWeight: 600, color: t.accent,
        background: 'transparent',
      }}>{secondary}</button>
    </Sheet>
  );
}

function authLabelStyle(t) {
  return {
    fontSize: 10, color: t.dim, textTransform: 'uppercase',
    letterSpacing: 0.6, fontWeight: 600, marginBottom: 6,
  };
}
function authInputStyle(t) {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${t.line}`, background: t.bg,
    color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
  };
}

Object.assign(window, { PublicLandingScreen });

// ── Free Play sessions section (logged-in only) ──
// Header row is expandable: tapping the body toggles expanded; tapping the
// + icon (and only the + icon) navigates to the freeplay creator.
function FreePlaySection() {
  const t = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const live      = FREEPLAY_SESSIONS.filter(s => s.status === 'live');
  const upcoming  = FREEPLAY_SESSIONS.filter(s => s.status === 'upcoming');
  const completed = FREEPLAY_SESSIONS.filter(s => s.status === 'completed');
  const ordered   = [...live, ...upcoming, ...completed];

  // Collapsed: show only 1 (most-relevant: live > upcoming > completed)
  const visible = expanded ? ordered : ordered.slice(0, 1);
  const hiddenCount = ordered.length - visible.length;

  function goCreate(e) {
    e.stopPropagation();
    router.push('freeplay');
  }

  return (
    <div style={{ padding: '0 16px 18px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <Label color={t.free} style={{ marginBottom: 0 }}>Free Play</Label>
        <span style={{ fontSize: 10, color: t.dim }}>{ordered.length} sessions</span>
      </div>

      <div style={{
        background: t.surface, border: `1px solid ${t.line}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* Header row — expandable. + icon is the only nav trigger. */}
        <div
          onClick={() => setExpanded(v => !v)}
          className="tap"
          role="button"
          style={{
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: visible.length ? `1px solid ${t.line}` : 'none',
            background: hexA(t.free, 0.06),
          }}>
          <button
            onClick={goCreate}
            aria-label="Create Free Play"
            className="tap"
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: hexA(t.free, 0.18), color: t.free,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0,
              border: `1px solid ${hexA(t.free, 0.32)}`,
            }}>
            <Icons.plus s={20} c={t.free}/>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Free Play sessions</div>
            <div style={{ fontSize: 11, color: t.dim, marginTop: 1 }}>
              {expanded
                ? 'Tap the + to start a new one'
                : (hiddenCount > 0 ? `Tap to see ${hiddenCount} more · + to create` : 'Tap + to create')}
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
          }}>
            <Icons.chevD s={16} c={t.dim}/>
          </span>
        </div>

        {visible.map((s, i) => (
          <FreePlayRow key={s.id} session={s} last={i === visible.length - 1}
            onClick={() => router.push('freeplay')}/>
        ))}
      </div>
    </div>
  );
}

function FreePlayRow({ session, last, onClick }) {
  const t = useTheme();
  const meta = {
    live:      { c: t.ok,      label: 'LIVE',      icon: 'play'     },
    upcoming:  { c: t.free,    label: 'UPCOMING',  icon: 'calendar' },
    completed: { c: t.dim,     label: 'COMPLETED', icon: 'check'    },
  }[session.status];
  const I = Icons[meta.icon];
  return (
    <button onClick={onClick} className="tap" style={{
      width: '100%', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px',
      borderBottom: last ? 'none' : `1px solid ${t.line}`,
      background: 'transparent',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: hexA(meta.c, 0.14), color: meta.c,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <I s={16} c={meta.c}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: t.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{session.name}</div>
        <div style={{ fontSize: 11, color: t.dim, marginTop: 1 }}>{session.when}</div>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
        color: meta.c, background: hexA(meta.c, 0.14),
        padding: '4px 7px', borderRadius: 5,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {session.status === 'live' && (
          <span className="dot-pulse" style={{
            width: 5, height: 5, borderRadius: '50%', background: meta.c, color: meta.c,
          }}/>
        )}
        {meta.label}
      </span>
    </button>
  );
}
