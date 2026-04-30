/**
 * FreePlayJoin — public read-only view of a Free Play session.
 *
 * Handles two URL shapes:
 *   /free-play/join/:code  — new invite_code-based URL
 *   /free-play/:id/join    — legacy UUID-based URL (backwards compat)
 *
 * Any visitor (authenticated or not) can view; no interactive controls.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { getFreePlayByInviteCode, getFreePlay } from '../services/freePlayService'
import { calcOverallStandings, calcPlayerStandings } from '../lib/standings'
import { useAuth } from '../contexts/AuthContext'
import { AppBadge } from '../components/ui-new'

// ─── Icons ────────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const BackIcon   = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>
const LockIcon   = () => <Svg size={14}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></Svg>
const EyeIcon    = () => <Svg size={14}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Svg>

// ─── Standings tables (reused from FreePlaySession, local copy) ───────────────
function TeamsRankingTable({ rows }) {
  return (
    <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
      <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt">
        <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
        <span className="flex-1  text-[10px] font-bold text-dim">TEAM</span>
        <span className="w-6 text-center text-[10px] font-bold text-dim">W</span>
        <span className="w-6 text-center text-[10px] font-bold text-dim">L</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">PTS</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-center text-[13px] text-dim py-4">No results yet</div>
      ) : rows.map((row, i) => (
        <div
          key={row.id}
          className={`flex items-center px-3.5 py-2.5 ${i < rows.length - 1 ? 'border-b border-line' : ''} ${i === 0 ? 'bg-free/15' : ''}`}
        >
          <span className={`w-[20px] text-[13px] font-bold ${i === 0 ? 'text-free' : 'text-dim'}`}>{i + 1}</span>
          <div className="flex-1 overflow-hidden pr-2">
            <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
            {row.playerNames && <div className="text-[10px] text-dim truncate">{row.playerNames}</div>}
          </div>
          <span className="w-6 text-center text-[13px] font-semibold text-success flex-shrink-0">{row.wins}</span>
          <span className="w-6 text-center text-[13px] font-semibold text-error flex-shrink-0">{row.losses}</span>
          <span className="w-7 text-center text-[13px] font-bold text-free flex-shrink-0">{row.pts}</span>
        </div>
      ))}
    </div>
  )
}

function PlayersRankingTable({ rows }) {
  return (
    <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
      <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt">
        <span className="w-[30px] text-[10px] font-bold text-dim text-center">#</span>
        <span className="flex-1  text-[10px] font-bold text-dim">PLAYER</span>
        <span className="w-10 text-center text-[10px] font-bold text-dim">W</span>
        <span className="w-10 text-center text-[10px] font-bold text-dim">L</span>
        <span className="w-12 text-center text-[10px] font-bold text-dim">PTS</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-center text-[13px] text-dim py-4">No results yet</div>
      ) : rows.map((row, i) => (
        <div
          key={row.id}
          className={`flex items-center px-3.5 py-2.5 ${i < rows.length - 1 ? 'border-b border-line' : ''} ${i === 0 ? 'bg-free/15' : ''}`}
        >
          <span className={`w-[30px] text-[13px] font-bold text-center ${i === 0 ? 'text-free' : 'text-dim'}`}>{i + 1}</span>
          <div className="flex-1 overflow-hidden pr-2">
            <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
          </div>
          <span className="w-10 text-center text-[13px] font-semibold text-success flex-shrink-0">{row.wins}</span>
          <span className="w-10 text-center text-[13px] font-semibold text-error flex-shrink-0">{row.losses}</span>
          <span className="w-12 text-center text-[13px] font-bold text-free flex-shrink-0">{row.pts}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TABS = ['matches', 'players', 'ranking']

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 px-4 mb-4">
      {TABS.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`flex-1 py-2 rounded-xl text-[12px] font-bold capitalize transition-all border-0 cursor-pointer
            ${active === t ? 'bg-free text-white' : 'bg-surface border border-line text-dim'}`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FreePlayJoin() {
  // Route params — one of these will be defined depending on which URL pattern matched
  const { code, id } = useParams()
  const navigate     = useNavigate()
  const location     = useLocation()
  const { session: authSession } = useAuth()

  const [fpSession, setFpSession] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [activeTab, setActiveTab] = useState('matches')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        let data
        if (code) {
          data = await getFreePlayByInviteCode(code)
        } else if (id) {
          // Legacy /free-play/:id/join — fetch directly by id
          data = await getFreePlay(id)
        }
        if (!cancelled) setFpSession(data)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Session not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [code, id])

  // ── Standings ──────────────────────────────────────────────────────────────
  const matches = useMemo(() => (fpSession?.games || [])
    .filter(g => g.played)
    .map(g => ({
      team1:  g.team1Id,
      team2:  g.team2Id,
      score1: g.setsPerMatch > 1
        ? (g.sets || []).filter(s => s.winner === 1).length
        : (g.score1 ?? 0),
      score2: g.setsPerMatch > 1
        ? (g.sets || []).filter(s => s.winner === 2).length
        : (g.score2 ?? 0),
      played: true,
    })),
  [fpSession])

  const teamRanking   = useMemo(
    () => fpSession ? calcOverallStandings(fpSession.teams || [], matches, fpSession.players || []) : [],
    [fpSession, matches],
  )
  const playerRanking = useMemo(
    () => fpSession ? calcPlayerStandings(fpSession.teams || [], matches, fpSession.players || []) : [],
    [fpSession, matches],
  )

  // ── Is the viewer the admin? ───────────────────────────────────────────────
  const viewerId = authSession?.user?.id
  const isAdmin  = fpSession && viewerId && fpSession.created_by === viewerId

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-free border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !fpSession) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-3 px-6">
        <div className="text-[15px] font-bold text-center">Session not found</div>
        <div className="text-[13px] text-dim text-center">This invite link may have expired or the session doesn&apos;t exist.</div>
        {authSession && (
          <button onClick={() => navigate('/free-play')} className="text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer">
            ← Back to Free Play
          </button>
        )}
      </div>
    )
  }

  const isFinished   = fpSession.status === 'finished'
  const playedGames  = fpSession.games.filter(g => g.played)
  const teamName     = (tid) => fpSession.teams.find(t => t.id === tid)?.name || '?'

  return (
    <div className="screen bg-bg text-text">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="screen__top px-4 pt-5 pb-3">
        {authSession ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-text mb-3"
          >
            <BackIcon />
          </button>
        ) : (
          <div className="mb-3" />
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-black text-free uppercase tracking-widest truncate">
              {fpSession.name || 'Free Play'}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <AppBadge text={isFinished ? 'Finished' : 'Live'} variant={isFinished ? 'dim' : 'free'} />
              <span className="text-[11px] text-dim flex items-center gap-1">
                <EyeIcon /> View only
              </span>
            </div>
          </div>

          {/* Admin: link to full session */}
          {isAdmin && (
            <button
              onClick={() => navigate(`/free-play/${fpSession.id}`)}
              className="shrink-0 px-3 py-2 rounded-xl bg-free text-white text-[12px] font-bold border-0 cursor-pointer"
            >
              Manage
            </button>
          )}
        </div>
      </div>

      {/* ── View-only notice bar ────────────────────────────────────────── */}
      <div className="mx-4 mb-3 flex items-center gap-2 bg-alt border border-line rounded-xl px-3.5 py-2.5">
        <span className="text-dim shrink-0"><LockIcon /></span>
        <span className="text-[12px] text-dim">
          You&apos;re viewing a shared session — read only.
          {!authSession && (
            <> <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="text-free font-semibold">Log in</Link> to see your sessions.</>
          )}
        </span>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="screen__body pb-10 px-4">

        {/* ── MATCHES tab ─────────────────────────────────────────────── */}
        {activeTab === 'matches' && (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">
              Past Matches ({playedGames.length})
            </div>
            {playedGames.length === 0 ? (
              <div className="text-[13px] text-dim">No matches played yet.</div>
            ) : (
              fpSession.games
                .filter(g => g.played)
                .map((g, i) => {
                  const t1 = teamName(g.team1Id)
                  const t2 = teamName(g.team2Id)
                  const useSets = (g.setsPerMatch || 1) > 1
                  const s1 = useSets ? (g.sets || []).filter(s => s.winner === 1).length : (g.score1 ?? 0)
                  const s2 = useSets ? (g.sets || []).filter(s => s.winner === 2).length : (g.score2 ?? 0)
                  return (
                    <div key={g.id} className="bg-surface rounded-xl px-3.5 py-3 border border-line">
                      <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">
                        Match {i + 1}
                      </div>
                      <div className="flex items-center">
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13px] truncate ${g.winnerId === g.team1Id ? 'font-bold text-free' : 'font-medium text-dim'}`}>
                            {t1}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-3 shrink-0">
                          <span className={`text-[16px] font-bold ${g.winnerId === g.team1Id ? 'text-free' : 'text-text'}`}>{s1}</span>
                          <span className="text-[10px] text-dim">–</span>
                          <span className={`text-[16px] font-bold ${g.winnerId === g.team2Id ? 'text-free' : 'text-text'}`}>{s2}</span>
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <div className={`text-[13px] truncate ${g.winnerId === g.team2Id ? 'font-bold text-free' : 'font-medium text-dim'}`}>
                            {t2}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
            )}

            {/* In-progress match notice */}
            {fpSession.games.some(g => !g.played) && (
              <div className="mt-2 flex items-center gap-2 bg-free/10 border border-free/30 rounded-xl px-3.5 py-3">
                <span className="text-[18px]">🏐</span>
                <div>
                  <div className="text-[13px] font-bold text-free">Match in progress</div>
                  <div className="text-[11px] text-dim">A match is currently being played.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PLAYERS tab ─────────────────────────────────────────────── */}
        {activeTab === 'players' && (
          <div className="flex flex-col gap-4">
            <div className="text-[11px] font-bold text-dim uppercase tracking-wide">
              Players ({fpSession.players.length})
            </div>
            {fpSession.players.length === 0 ? (
              <div className="text-[13px] text-dim">No players in this session.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fpSession.players.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-surface border border-line rounded-full pl-3 pr-3 py-1.5 shrink-0">
                    <span className="text-[13px] font-semibold text-text leading-none">{p.name}</span>
                    {p.isGuest && <AppBadge text="Guest" variant="dim" />}
                  </div>
                ))}
              </div>
            )}

            {fpSession.teams.length > 0 && (
              <>
                <div className="text-[11px] font-bold text-dim uppercase tracking-wide mt-2">
                  Teams ({fpSession.teams.length})
                </div>
                <div className="flex flex-col gap-2">
                  {fpSession.teams.map(team => {
                    const teamPlayers = (team.playerIds || [])
                      .map(pid => fpSession.players.find(p => p.id === pid))
                      .filter(Boolean)
                    return (
                      <div key={team.id} className="bg-surface border border-line rounded-xl p-3">
                        <div className="text-[14px] font-bold text-text mb-2">{team.name}</div>
                        {teamPlayers.length === 0 ? (
                          <div className="text-[12px] text-dim">No players assigned</div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {teamPlayers.map(p => (
                              <span key={p.id} className="text-[11px] font-semibold bg-bg border border-line rounded-full px-2.5 py-1 text-dim">
                                {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── RANKING tab ─────────────────────────────────────────────── */}
        {activeTab === 'ranking' && (
          <div className="flex flex-col gap-4">
            {fpSession.teams.length === 0 ? (
              <div className="text-[13px] text-dim text-center py-10">No teams yet.</div>
            ) : (
              <>
                <div>
                  <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Teams</div>
                  <TeamsRankingTable rows={teamRanking} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Players</div>
                  <PlayersRankingTable rows={playerRanking} />
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
