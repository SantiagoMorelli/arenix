// App entry — theme + router + workspace + tweaks panel

const SCREENS = {
  home:         () => <HomeScreen variant={window.TWEAKS?.homeVariant || 'hero'}/>,
  league:       () => <LeagueScreen/>,
  tournament:   () => <TournamentScreen/>,
  tsetup:       () => <TournamentSetup/>,
  live:         () => <LiveMatchFlow/>,
  freeplay:     () => <FreePlayScreen/>,
  profile:      () => <ProfileScreen/>,
  notifications:() => <NotificationsScreen/>,
  settings:     () => <SettingsScreen/>,
};

function App() {
  const initialTheme = window.TWEAKS?.theme || 'dark';
  const initialAccent = window.TWEAKS?.accent || 'orange';

  const [mode, setMode] = useState(initialTheme);
  const [accentKey, setAccentKey] = useState(initialAccent);
  const [homeVariant, setHomeVariant] = useState(window.TWEAKS?.homeVariant || 'hero');
  const [scoreVariant, setScoreVariant] = useState(window.TWEAKS?.scoreVariant || 'broadcast');

  // restore persisted stack
  const [stack, setStack] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('arenix_stack') || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return ['home'];
  });

  useEffect(() => {
    localStorage.setItem('arenix_stack', JSON.stringify(stack));
  }, [stack]);

  useEffect(() => {
    document.body.classList.toggle('dark', mode === 'dark');
    document.body.classList.toggle('light', mode === 'light');
  }, [mode]);

  // keep TWEAKS in sync for children that read it at render (e.g. variants)
  useEffect(() => {
    window.TWEAKS = { ...(window.TWEAKS || {}), theme: mode, accent: accentKey, homeVariant, scoreVariant };
  }, [mode, accentKey, homeVariant, scoreVariant]);

  const theme = useMemo(() => buildTheme(mode, accentKey), [mode, accentKey]);

  const router = useMemo(() => ({
    current: stack[stack.length - 1],
    push:    (r) => setStack(s => [...s, r]),
    replace: (r) => setStack(s => [...s.slice(0, -1), r]),
    pop:     ()  => setStack(s => s.length > 1 ? s.slice(0, -1) : s),
    reset:   (r = 'home') => setStack([r]),
  }), [stack]);

  // ─── Tweaks host integration ──────────────────────────────
  const [tweaksOpen, setTweaksOpen] = useState(false);
  useEffect(() => {
    const h = (e) => {
      const d = e.data || {};
      if (d.type === '__activate_edit_mode')   setTweaksOpen(true);
      if (d.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', h);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', h);
  }, []);

  const setTweak = (patch) => {
    if (patch.theme)        setMode(patch.theme);
    if (patch.accent)       setAccentKey(patch.accent);
    if (patch.homeVariant)  setHomeVariant(patch.homeVariant);
    if (patch.scoreVariant) setScoreVariant(patch.scoreVariant);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };

  const CurrentScreen = SCREENS[router.current] || SCREENS.home;
  // Pass homeVariant explicitly so it updates live
  const screenEl = router.current === 'home'
    ? <HomeScreen variant={homeVariant}/>
    : <CurrentScreen/>;

  return (
    <ThemeContext.Provider value={theme}>
      <RouterContext.Provider value={router}>
        <div className="workspace" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh',
        }}>
          <PhoneFrame key={router.current}>
            {screenEl}
          </PhoneFrame>
        </div>
        {tweaksOpen && (
          <TweaksPanel
            mode={mode} accentKey={accentKey}
            homeVariant={homeVariant} scoreVariant={scoreVariant}
            onChange={setTweak}
            onClose={() => setTweaksOpen(false)}
          />
        )}
      </RouterContext.Provider>
    </ThemeContext.Provider>
  );
}

function TweaksPanel({ mode, accentKey, homeVariant, scoreVariant, onChange, onClose }) {
  const t = useTheme();
  return (
    <div style={{
      position: 'fixed', right: 16, bottom: 16, zIndex: 1000,
      width: 280, maxWidth: 'calc(100vw - 32px)',
      background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 14, padding: 14,
      boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
      color: t.text, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="display" style={{ fontSize: 20, color: t.accent, letterSpacing: 1 }}>Tweaks</span>
        <button onClick={onClose} style={{
          width: 26, height: 26, borderRadius: 8, background: t.alt, color: t.dim,
          fontSize: 14,
        }}>×</button>
      </div>

      <TweakRow label="Theme">
        {['dark','light'].map(m => (
          <Seg key={m} on={mode === m} onClick={() => onChange({ theme: m })}>{m}</Seg>
        ))}
      </TweakRow>

      <TweakRow label="Accent">
        {['orange','teal','pink','lime'].map(a => (
          <button key={a} onClick={() => onChange({ accent: a })} className="tap" style={{
            flex: 1, height: 30, borderRadius: 8,
            background: ACCENTS[a][mode],
            border: accentKey === a ? `2px solid ${t.text}` : `2px solid transparent`,
            fontSize: 10, fontWeight: 700, color: '#fff',
          }}>{a}</button>
        ))}
      </TweakRow>

      <TweakRow label="Home layout">
        {[
          { id: 'hero',  l: 'Hero' },
          { id: 'split', l: 'Split' },
          { id: 'feed',  l: 'Feed' },
        ].map(x => (
          <Seg key={x.id} on={homeVariant === x.id} onClick={() => onChange({ homeVariant: x.id })}>{x.l}</Seg>
        ))}
      </TweakRow>

      <div style={{ fontSize: 10, color: t.dim, textAlign: 'center', marginTop: 6 }}>
        Settings persist across reloads
      </div>
    </div>
  );
}

function TweakRow({ label, children }) {
  const t = useTheme();
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: t.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>{children}</div>
    </div>
  );
}

function Seg({ on, onClick, children }) {
  const t = useTheme();
  return (
    <button onClick={onClick} className="tap" style={{
      flex: 1, padding: '7px 10px', borderRadius: 8,
      background: on ? t.accent : t.alt,
      color: on ? '#fff' : t.dim,
      fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
      border: 0,
    }}>{children}</button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
