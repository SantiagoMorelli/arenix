import { teamName, roundLabel } from '../../lib/tournament'

export default function KnockoutResults({ tournament, onMatchClick, players = [] }) {
  const rounds = (tournament.knockout?.rounds || [])
    .filter(r => r.matches.some(m => m.team1 && m.team2))

  if (!rounds.length) return null

  const pNames = id => {
    const t = tournament.teams.find(x => x.id === id)
    return (t?.players || []).map(pid => {
      const p = players.find(x => x.id === pid)
      return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
    }).join(' · ')
  }

  return (
    <div className="mt-5">
      <div className="text-[12px] font-bold text-accent tracking-wide uppercase mb-2.5">
        Knockout Stage
      </div>

      {rounds.map(round => (
        <div key={round.id} className="mb-3">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-1.5">
            {roundLabel(round.id)}
          </div>

          {round.matches
            .filter(m => m.team1 && m.team2)
            .map(m => {
              const t1 = teamName(tournament.teams, m.team1)
              const t2 = teamName(tournament.teams, m.team2)
              const p1 = pNames(m.team1)
              const p2 = pNames(m.team2)
              return (
                <div
                  key={m.id}
                  onClick={() => m.played && onMatchClick && onMatchClick(m)}
                  className={`flex items-center px-3.5 py-2.5 rounded-xl mb-1.5 border ${
                    m.played && onMatchClick
                      ? 'bg-surface border-line cursor-pointer hover:bg-alt transition-colors'
                      : m.played
                      ? 'bg-surface border-line'
                      : 'bg-gradient-to-r from-surface to-alt border-accent/40'
                  }`}
                >
                  <div className="flex-1">
                    <div className={`text-[13px] ${m.played && m.winner === m.team1 ? 'font-bold text-accent' : 'font-medium text-text'}`}>{t1}</div>
                    {p1 && <div className="text-[10px] text-dim mt-0.5">{p1}</div>}
                  </div>
                  <span className="px-3 text-[14px] font-bold text-text flex-shrink-0">
                    {m.played ? `${m.score1} – ${m.score2}` : 'VS'}
                  </span>
                  <div className="flex-1 text-right">
                    <div className={`text-[13px] ${m.played && m.winner === m.team2 ? 'font-bold text-accent' : 'font-medium text-text'}`}>{t2}</div>
                    {p2 && <div className="text-[10px] text-dim mt-0.5">{p2}</div>}
                  </div>
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}
