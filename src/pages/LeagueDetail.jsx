import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useAuth } from '../contexts/AuthContext'
import { addPlayer, updatePlayer, deletePlayer } from '../services/playerService'
import { BottomNav, SectionLabel, AppBadge } from '../components/ui-new'
import LeaguePlayersTab from '../components/LeaguePlayersTab'
import SettingsTab from '../components/league/SettingsTab'
import { createNotification } from '../services/notificationService'
import { computePlayerLeagueRecord } from '../lib/playerStats'
import { useToast } from '../contexts/ToastContext'
import { ChevronLeft, BarChart2, Users, Trophy, Settings, Plus } from 'lucide-react'
// ─── Country → flag emoji ──────────────────────────────────────────────────────
const FLAG = {
  argentina: '🇦🇷', 'united states': '🇺🇸', brazil: '🇧🇷', spain: '🇪🇸',
  colombia: '🇨🇴', mexico: '🇲🇽', chile: '🇨🇱', uruguay: '🇺🇾',
  france: '🇫🇷', germany: '🇩🇪', italy: '🇮🇹', australia: '🇦🇺',
  portugal: '🇵🇹', japan: '🇯🇵', canada: '🇨🇦', uk: '🇬🇧',
  'united kingdom': '🇬🇧', netherlands: '🇳🇱', sweden: '🇸🇪', norway: '🇳🇴',
}
// eslint-disable-next-line no-unused-vars
function countryFlag(country) {
  if (!country) return ''
  return FLAG[country.toLowerCase()] || ''
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function playerAvatarStyle(seed) {
  let h = 0
  const str = String(seed)
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return { backgroundColor: `oklch(0.38 0.13 ${h % 360})` }
}

function getTournamentStatus(t) {
  if (t.status === 'completed') return { label: 'Completed', variant: 'dim' }
  if (['group', 'knockout', 'freeplay'].includes(t.phase)) return { label: 'In Progress', variant: 'success' }
  if (t.phase === 'setup') return { label: 'Setup', variant: 'accent' }
  return { label: 'Active', variant: 'success' }
}

function getTournamentPlayerCount(t) {
  return new Set((t.teams || []).flatMap(team => team.players || [])).size
}

function getTournamentPodium(t, leaguePlayers = []) {
  if (t.status !== 'completed') return null
  
  let firstTeamId = null
  let secondTeamId = null
  let thirdTeamId = null
  const teams = t.teams || []

  // 1. Try Knockout final and third place matches
  const ko = t.knockout?.rounds
  if (ko) {
    const finalRound = ko.find(r => r.id === 'final')
    if (finalRound?.matches?.length) {
      const match = finalRound.matches[0]
      if (match.played && match.winner) {
        firstTeamId = match.winner
        secondTeamId = match.winner === match.team1 ? match.team2 : match.team1
      }
    }
    const thirdRound = ko.find(r => r.id === 'third_place')
    if (thirdRound?.matches?.length) {
      const match = thirdRound.matches[0]
      if (match.played && match.winner) {
        thirdTeamId = match.winner
      }
    }
  }

  // 2. Fallback to winnerTeamId if not found from KO
  if (!firstTeamId && t.winnerTeamId) {
    firstTeamId = t.winnerTeamId
  }

  // 3. Fallback to points/wins if not fully decided by KO
  if (!firstTeamId && teams.length > 0) {
    const sorted = [...teams].sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0)
      return (b.wins || 0) - (a.wins || 0)
    })
    firstTeamId = sorted[0]?.id
    secondTeamId = sorted[1]?.id
    thirdTeamId = sorted[2]?.id
  } else if (firstTeamId && (!secondTeamId || !thirdTeamId) && teams.length > 1) {
    const remaining = teams.filter(tm => tm.id !== firstTeamId && tm.id !== secondTeamId).sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0)
      return (b.wins || 0) - (a.wins || 0)
    })
    if (!secondTeamId) secondTeamId = remaining[0]?.id
    if (!thirdTeamId && remaining.length > (secondTeamId ? 1 : 0)) {
      thirdTeamId = remaining[secondTeamId ? 1 : 0]?.id
    }
  }

  const formatTeam = (teamId) => {
    if (!teamId) return null
    const team = teams.find(tm => tm.id === teamId)
    if (!team) return null
    const pNames = (team.players || []).map(pid => {
      const p = leaguePlayers.find(lp => lp.id === pid)
      return p ? (p.displayName || p.name) : 'Unknown'
    }).join(', ')
    return pNames ? `${team.name} (${pNames})` : team.name
  }

  const result = {
    first: formatTeam(firstTeamId),
    second: formatTeam(secondTeamId),
    third: formatTeam(thirdTeamId)
  }
  
  if (!result.first && !result.second && !result.third) return null
  return result
}

const NAV_ITEMS = [
  { id: 'rankings',    icon: <BarChart2 size={20} />,  label: 'Rankings'    },
  { id: 'players',     icon: <Users size={20} />,  label: 'Players'     },
  { id: 'tournaments', icon: <Trophy size={20} />, label: 'Tournaments' },
  { id: 'settings',    icon: <Settings size={20} />,   label: 'Settings'    },
]

// Nav items shown to guests (no settings tab)
const GUEST_NAV_ITEMS = [
  { id: 'rankings',    icon: <BarChart2 size={20} />,  label: 'Rankings'    },
  { id: 'players',     icon: <Users size={20} />,  label: 'Players'     },
  { id: 'tournaments', icon: <Trophy size={20} />, label: 'Tournaments' },
]

// ─── LeagueDetail page ────────────────────────────────────────────────────────
export default function LeagueDetail() {
  const navigate             = useNavigate()
  const { id }               = useParams()
  const location             = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'rankings')
  const { showError }        = useToast()

  const { league, loading, error, refetch } = useLeague(id)
  const { isAdmin, isSuperAdmin }            = useLeagueRole(id)
  const { session, profile }                 = useAuth()

  const isGuest = !session

  // Redirect guests who land on a private league to login with ?next=
  useEffect(() => {
    if (!loading && !error && league && isGuest && league.visibility !== 'public') {
      navigate(`/login?next=/league/${id}`, { replace: true })
    }
  }, [loading, error, league, isGuest, id, navigate])

  // ── Player mutations ──────────────────────────────────────────────────────
  async function handleAddPlayer(data) {
    try {
      await addPlayer(id, data)
      refetch()
    } catch (err) {
      showError(err, 'Failed to add player.')
    }
  }

  async function handleUpdatePlayer(playerId, updates) {
    const leagueName = league?.name || 'a league'
    const leagueId   = league?.id
    // Capture current userId before the update (needed for unlink notification)
    const currentUserId = (league?.players || []).find(p => p.id === playerId)?.userId ?? null

    try {
      await updatePlayer(playerId, updates)

      if (updates.userId) {
        await createNotification(
          updates.userId,
          'profile_linked',
          'You were added to a league 🤝',
          `Your profile was linked in ${leagueName}`,
          { leagueId },
        )
      } else if ('userId' in updates && updates.userId === null && currentUserId) {
        await createNotification(
          currentUserId,
          'profile_unlinked',
          'Profile unlinked 🔓',
          `Your profile was unlinked from ${leagueName}`,
          { leagueId },
        )
      }

      refetch()
    } catch (err) {
      showError(err, 'Failed to update player.')
    }
  }

  async function handleDeletePlayer(playerId) {
    try {
      await deletePlayer(playerId)
      refetch()
    } catch (err) {
      showError(err, 'Failed to delete player.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !league) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2">
        <div className="text-[18px] font-bold">League not found</div>
        <button onClick={() => navigate('/')} className="text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer">
          ← Back to home
        </button>
      </div>
    )
  }

  const rankedPlayers = [...(league.players || [])]
    .map(p => {
      const { wins, losses, score } = computePlayerLeagueRecord(p.id, league)
      return { ...p, wins, losses, _score: p.elo ?? 1000 }
    })
    .sort((a, b) => b._score - a._score)
  const tournaments   = [...(league.tournaments || [])].reverse()
  const myPlayer      = rankedPlayers.find(p => p.userId === profile?.id)
  const myRank        = myPlayer ? rankedPlayers.indexOf(myPlayer) + 1 : null

  return (
    <div className="screen bg-bg text-text">

      {/* ── Fixed top header ── */}
      <div className="screen__top flex items-center gap-2.5 px-4 pt-2.5 pb-4">
        <button
          onClick={() => navigate('/')}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-bold text-text leading-tight">{league.name}</div>
          <div className="text-[11px] text-dim">
            Season {new Date().getFullYear()}
            {league.location && <> · {league.location}</>}
          </div>
        </div>
        {/* Guest: show Log in button in header */}
        {isGuest && (
          <button
            onClick={() => navigate(`/login?next=/league/${id}`)}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-bold border-0 cursor-pointer shrink-0"
          >
            Log in
          </button>
        )}
      </div>

      {/* ── Guest join banner (public leagues only) ── */}
      {isGuest && (
        <div className="mx-4 mb-3 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-[14px] px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-accent leading-snug">Viewing as guest</div>
            <div className="text-[11px] text-dim mt-0.5">Log in or sign up to join this league.</div>
          </div>
          <button
            onClick={() => navigate(`/login?next=/league/${id}`)}
            className="shrink-0 px-3 py-2 rounded-xl bg-accent text-white text-[12px] font-bold border-0 cursor-pointer"
          >
            Join
          </button>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <main className="screen__body">
        <div className="px-4 pb-6">

          {/* ════ Rankings tab ════ */}
          {activeTab === 'rankings' && (
            <>
              {/* YOUR POSITION hero card — only shown if current user has a linked player */}
              {myRank && (
                <div className="bg-gradient-to-br from-surface to-alt rounded-[14px] border border-line mt-2 mb-4 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <div className="text-[11px] font-bold text-accent tracking-[1.2px] uppercase mb-1">Your Position</div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-[40px] leading-none text-accent">#{myRank}</span>
                        <span className="text-[12px] text-dim">of {rankedPlayers.length} · {myPlayer.elo ?? 1000} pts</span>
                      </div>
                    </div>
                    <div className="w-20 h-[60px] flex-shrink-0">
                      <svg width="100%" height="100%" viewBox="0 0 80 60">
                        <polyline
                          points="0,50 15,42 30,44 45,30 60,28 80,18"
                          stroke="#F5A623" strokeWidth="2" fill="none" strokeLinecap="round"
                        />
                        <polyline
                          points="0,50 15,42 30,44 45,30 60,28 80,18 80,60 0,60"
                          fill="rgba(245,166,35,0.15)" stroke="none"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              <SectionLabel color="accent">Top Players</SectionLabel>

              {rankedPlayers.length > 0 ? (
                <div className="bg-surface rounded-[14px] overflow-hidden border border-line mb-4">
                  {rankedPlayers.slice(0, 8).map((player, i, arr) => {
                    const isMe  = player.userId === profile?.id
                    const label = player.displayName || player.name
                    const wl = `${player.wins ?? 0}W - ${player.losses ?? 0}L`
                      
                      return (
                      <div
                        key={player.id}
                        className={`flex items-center px-3.5 py-[11px] ${i < arr.length - 1 ? 'border-b border-line' : ''} ${isMe ? 'bg-accent/10' : ''}`}
                      >
                        <span className={`font-display w-7 text-[18px] leading-none flex-shrink-0 ${i < 3 ? 'text-accent' : 'text-dim'}`}>
                          {i + 1}
                        </span>
                        <div
                          className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
                          style={playerAvatarStyle(player.id || player.name)}
                        >
                          {label[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 ml-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[13px] truncate ${isMe ? 'font-bold text-text' : 'font-medium text-text'}`}>
                              {label}
                            </span>
                            {isMe && <span className="text-[10px] font-bold text-accent flex-shrink-0">YOU</span>}
                          </div>
                          {wl && <div className="text-[10px] text-dim mt-0.5">{wl}</div>}
                        </div>
                        <span className="font-display text-[18px] text-text leading-none ml-2">{player.elo ?? 0}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-[13px] text-dim text-center py-6 mb-4">No players yet</div>
              )}
            </>
          )}

          {/* ════ Players tab ════ */}
          {activeTab === 'players' && (
            <LeaguePlayersTab
              league={league}
              isAdmin={isGuest ? false : isAdmin}
              onAdd={handleAddPlayer}
              onDelete={handleDeletePlayer}
              onUpdate={handleUpdatePlayer}
              currentUserId={profile?.id}
            />
          )}

          {/* ════ Tournaments section (Rankings + Tournaments tabs) ════ */}
          {(activeTab === 'rankings' || activeTab === 'tournaments') && (
            <>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[12px] font-bold text-accent tracking-wide uppercase">Tournaments</span>
                {isAdmin && !isGuest && (
                  <button
                    onClick={() => navigate(`/league/${id}/tournament/new`)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0"
                  >
                    <Plus size={14} /> New
                  </button>
                )}
              </div>

              {tournaments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {(activeTab === 'tournaments' ? tournaments : tournaments.slice(0, 5)).map(t => {
                    const { label, variant } = getTournamentStatus(t)
                    const pCount             = getTournamentPlayerCount(t)
                    const podium             = getTournamentPodium(t, league?.players || [])
                    const modeLabel          = t.teamSize ? `${t.teamSize} vs ${t.teamSize}` : 'Custom'
                    const teamsCount         = (t.teams || []).length

                    return (
                      <div
                        key={t.id}
                        onClick={() => navigate(`/league/${id}/tournament/${t.id}`)}
                        className="bg-surface rounded-xl p-3.5 flex flex-col gap-2.5 border border-line cursor-pointer active:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[10px] bg-accent/15 flex items-center justify-center flex-shrink-0 text-accent">
                            <Trophy size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-text truncate">{t.name}</div>
                            <div className="text-[11px] text-dim">{modeLabel} • {teamsCount} teams • {pCount} players</div>
                          </div>
                          <AppBadge text={label} variant={variant} />
                        </div>
                        {podium && (
                          <div className="mt-1 pt-2.5 border-t border-line/50 flex flex-col gap-1.5 pl-12">
                            {podium.first && <div className="text-[12px] text-text font-medium truncate">🥇 {podium.first}</div>}
                            {podium.second && <div className="text-[12px] text-dim truncate">🥈 {podium.second}</div>}
                            {podium.third && <div className="text-[12px] text-dim truncate">🥉 {podium.third}</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-[13px] text-dim text-center py-6">
                  No tournaments yet{isAdmin && !isGuest && ' — '}
                  {isAdmin && !isGuest && (
                    <button
                      onClick={() => navigate(`/league/${id}/tournament/new`)}
                      className="text-accent font-semibold bg-transparent border-0 cursor-pointer p-0"
                    >
                      create one
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════ Settings tab ════ */}
          {activeTab === 'settings' && !isGuest && (
            <SettingsTab league={league} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} refetch={refetch} currentUserId={profile?.id} />
          )}
          {activeTab === 'settings' && isGuest && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="text-[32px]">🔒</div>
              <div className="text-[15px] font-bold text-text">Log in to manage this league</div>
              <div className="text-[13px] text-dim">Settings are only available to league members.</div>
              <button
                onClick={() => navigate(`/login?next=/league/${id}`)}
                className="mt-2 px-6 py-2.5 rounded-xl bg-accent text-white font-bold text-[13px] border-0 cursor-pointer"
              >
                Log in
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ── Bottom navigation ── */}
      {!isGuest && (
        <BottomNav
          items={NAV_ITEMS}
          active={activeTab}
          onChange={setActiveTab}
        />
      )}
      {isGuest && (
        <BottomNav
          items={GUEST_NAV_ITEMS}
          active={activeTab}
          onChange={setActiveTab}
        />
      )}

    </div>
  )
}
