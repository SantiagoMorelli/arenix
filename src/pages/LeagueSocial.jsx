/**
 * LeagueSocial — experimental social-feed design for a league home.
 *
 * Lives at /league/:id/social alongside the classic LeagueDetail so both
 * designs can be compared on the same data. It reads the exact same league
 * object (useLeague) and the same aggregations (computeLeagueInsights) — the
 * only difference is presentation, and it owns a separate palette/typography
 * (the `soc-*` tokens in index.css) so it is free to diverge from the handoff
 * without leaking into the rest of the app.
 *
 * Read-only by design: no reactions, no comments, no writes.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, LayoutGrid, ListOrdered, Sparkles, Trophy } from 'lucide-react'
import { useLeague } from '../hooks/useLeague'
import { useAuth } from '../contexts/AuthContext'
import { computeLeagueInsights, computeRankMovement } from '../lib/leagueInsights'
import { buildSocialFeed, buildStoryRail } from '../lib/socialFeed'
import { setLeagueView, CLASSIC, SOCIAL } from '../lib/leagueViewPref'
import { clearLastLeague } from '../lib/lastLeague'
import { BallSpinner } from '../components/ui-new'
import SocialHero from '../components/social/SocialHero'
import StoryRail from '../components/social/StoryRail'
import SocialPostCard from '../components/social/SocialPostCard'
import SocialPlayerSheet from '../components/social/SocialPlayerSheet'
import SocialStandingsSheet from '../components/social/SocialStandingsSheet'

/** Posts rendered per page — keeps the first paint cheap on 4G. */
const PAGE_SIZE = 8

export default function LeagueSocial() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const { session, profile } = useAuth()

  const { league, loading, error } = useLeague(id)

  const [visible,      setVisible]      = useState(PAGE_SIZE)
  const [sheetPlayer,  setSheetPlayer]  = useState(null)
  const [showStandings, setShowStandings] = useState(false)

  const isGuest = !session

  // Remember the choice so /league/:id lands here next time
  useEffect(() => { setLeagueView(SOCIAL) }, [])

  // Same guard as LeagueDetail: guests can't read private leagues
  useEffect(() => {
    if (!loading && !error && league && isGuest && league.visibility !== 'public') {
      navigate(`/login?next=/league/${id}/social`, { replace: true })
    }
  }, [loading, error, league, isGuest, id, navigate])

  // Self-healing: forget a league that's gone so the startup redirect recovers
  useEffect(() => {
    if (!loading && (error || !league) && session?.user?.id) {
      clearLastLeague(session.user.id, id)
    }
  }, [loading, error, league, session, id])

  const insights = useMemo(
    () => (league ? computeLeagueInsights(league) : null),
    [league],
  )

  const posts = useMemo(
    () => (league && insights ? buildSocialFeed(league, insights) : []),
    [league, insights],
  )

  const rail = useMemo(
    () => (league && insights ? buildStoryRail(league, insights, profile?.id) : []),
    [league, insights, profile?.id],
  )

  const rankedPlayers = useMemo(
    () => [...(league?.players || [])].sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000)),
    [league],
  )

  const playersById = useMemo(
    () => new Map((league?.players || []).map(p => [p.id, p])),
    [league],
  )

  const myPlayer = rankedPlayers.find(p => p.userId && p.userId === profile?.id) || null
  const myRank   = myPlayer ? rankedPlayers.indexOf(myPlayer) + 1 : null

  function openPlayer(player) {
    setSheetPlayer(player)
    setShowStandings(false)
  }

  function switchToClassic() {
    setLeagueView(CLASSIC)
    navigate(`/league/${id}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-soc-bg">
        <BallSpinner size={32} />
      </div>
    )
  }

  if (error || !league) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-soc-bg text-soc-text gap-2">
        <div className="text-[18px] font-bold">League not found</div>
        <button
          onClick={() => navigate('/')}
          className="text-[13px] text-soc-lime font-semibold bg-transparent border-0 cursor-pointer"
        >
          ← Back to home
        </button>
      </div>
    )
  }

  const sheetRank = sheetPlayer ? rankedPlayers.indexOf(sheetPlayer) + 1 : null

  return (
    <div className="screen bg-soc-bg text-soc-text">

      {/* ── Top bar ── */}
      <div className="screen__top flex items-center gap-2.5 px-4 pt-2.5 pb-3 bg-soc-bg border-b border-soc-line/60">
        <button
          onClick={() => navigate('/')}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-soc-text"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-soc text-[17px] leading-tight truncate">{league.name}</div>
          <div className="flex items-center gap-1 text-[10px] text-soc-dim">
            <Sparkles size={10} className="text-soc-lime" />
            Season {new Date().getFullYear()}
            {league.location && <> · {league.location}</>}
          </div>
        </div>
        {isGuest && (
          <button
            onClick={() => navigate(`/login?next=/league/${id}/social`)}
            className="px-3 py-1.5 rounded-full bg-soc-lime text-soc-bg text-[12px] font-bold border-0 cursor-pointer shrink-0"
          >
            Log in
          </button>
        )}
      </div>

      {/* ── Feed ── */}
      <main className="screen__body">
        <div className="px-4 pt-3 pb-28">

          <StoryRail entries={rail} onSelect={openPlayer} />

          <SocialHero
            player={myPlayer}
            rank={myRank}
            total={rankedPlayers.length}
            streak={myPlayer ? insights.streaks.get(myPlayer.id) : null}
            movement={myPlayer ? computeRankMovement(insights.timelines, myPlayer.id) : null}
            onOpen={() => myPlayer && openPlayer(myPlayer)}
          />

          {posts.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-soc-line bg-soc-surface px-5 py-10 text-center">
              <Trophy size={22} className="text-soc-dim mx-auto mb-3" />
              <div className="font-soc text-[18px] mb-1.5">Nothing here yet</div>
              <div className="text-[12px] text-soc-dim leading-relaxed">
                Play a tournament and the feed fills up with results, streaks and records.
              </div>
            </div>
          ) : (
            <>
              {posts.slice(0, visible).map((post, i) => (
                <div
                  key={post.id}
                  className="animate-soc-rise"
                  // Stagger is per-item and computed — not expressible as a utility
                  style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                >
                  <SocialPostCard
                    post={post}
                    playersById={playersById}
                    onOpenTournament={tid => navigate(`/league/${id}/tournament/${tid}`)}
                    onOpenPlayer={openPlayer}
                  />
                </div>
              ))}

              {visible < posts.length && (
                <button
                  onClick={() => setVisible(v => v + PAGE_SIZE)}
                  className="w-full py-3.5 rounded-[18px] bg-soc-surface border border-soc-line text-[13px] font-bold text-soc-text cursor-pointer active:scale-[0.99] transition-transform"
                >
                  Load more
                </button>
              )}

              {visible >= posts.length && (
                <div className="text-center text-[11px] text-soc-dim py-4">
                  You're all caught up
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Floating bottom bar ── */}
      <div className="screen__bottom absolute bottom-0 inset-x-0 pointer-events-none">
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto flex items-center gap-1 max-w-[340px] rounded-full bg-soc-surface/95 border border-soc-line backdrop-blur px-1.5 py-1.5 shadow-2xl">
            <span className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-soc-lime text-soc-bg text-[12px] font-bold">
              <Sparkles size={14} />
              Feed
            </span>
            <button
              onClick={() => setShowStandings(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-transparent border-0 text-soc-dim text-[12px] font-bold cursor-pointer active:text-soc-text"
            >
              <ListOrdered size={14} />
              Table
            </button>
            <button
              onClick={() => navigate(`/league/${id}`, { state: { tab: 'tournaments' } })}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-transparent border-0 text-soc-dim text-[12px] font-bold cursor-pointer active:text-soc-text"
            >
              <Trophy size={14} />
              Events
            </button>
            <button
              onClick={switchToClassic}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-soc-alt border-0 text-soc-dim cursor-pointer shrink-0"
              aria-label="Switch to the classic league view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      <SocialPlayerSheet
        open={Boolean(sheetPlayer)}
        onClose={() => setSheetPlayer(null)}
        player={sheetPlayer}
        league={league}
        insights={insights}
        rank={sheetRank}
      />

      <SocialStandingsSheet
        open={showStandings}
        onClose={() => setShowStandings(false)}
        rankedPlayers={rankedPlayers}
        insights={insights}
        currentUserId={profile?.id}
        onSelect={player => openPlayer(player)}
      />
    </div>
  )
}
