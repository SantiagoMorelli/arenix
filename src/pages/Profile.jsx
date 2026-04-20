import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav, SectionLabel } from '../components/ui-new'

// ─── Inline SVG icons ────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    {children}
  </svg>
)

const HomeIcon = () => (
  <Svg>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
)

const StarIcon = () => (
  <Svg>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
)

const GearIcon = ({ size = 20 }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </Svg>
)

// ─── Hardcoded data ───────────────────────────────────────────────────────────
const TOP_STATS = [
  { value: '47',  label: 'Matches',  colorClass: 'text-accent'  },
  { value: '28W', label: 'Wins',     colorClass: 'text-success' },
  { value: '60%', label: 'Win Rate', colorClass: 'text-free'    },
]

const DETAIL_STATS = [
  { value: '142', label: 'Total Points', emoji: '💥' },
  { value: '38',  label: 'Aces',         emoji: '🎯' },
  { value: '12',  label: 'Best Streak',  emoji: '🔥' },
  { value: '#3',  label: 'League Rank',  emoji: '🏆' },
]

const LEAGUES = [
  { name: 'Miami Beach League', season: '2026', players: 24, rank: '#3', role: 'Player',
    wins: '8W', losses: '4L', tournaments: '3' },
  { name: 'South Beach Open',   season: '2025', players: 16, rank: '#1', role: 'Admin',
    wins: '12W', losses: '2L', tournaments: '5' },
]

const MATCHES = [
  { date: 'Apr 12', tourn: 'Spring Cup',  t1: 'Alpha',         t2: 'Bravo',       s1: 21, s2: 18, won: true,  type: 'Tournament' },
  { date: 'Apr 10', tourn: 'Free Play',   t1: 'Santi & Marco', t2: 'Julia & Alex', s1: 15, s2: 21, won: false, type: 'Free Play'  },
  { date: 'Apr 8',  tourn: 'Spring Cup',  t1: 'Alpha',         t2: 'Charlie',     s1: 21, s2: 12, won: true,  type: 'Tournament' },
  { date: 'Apr 5',  tourn: 'Free Play',   t1: 'Santi & Ana',   t2: 'Diego & Luis', s1: 21, s2: 19, won: true,  type: 'Free Play'  },
  { date: 'Apr 2',  tourn: 'Winter Clash',t1: 'Bravo',         t2: 'Delta',       s1: 18, s2: 21, won: false, type: 'Tournament' },
]

const TABS = [
  { id: 'stats',   label: 'Stats'   },
  { id: 'leagues', label: 'Leagues' },
  { id: 'matches', label: 'Matches' },
]

const NAV_ITEMS = [
  { id: 'home',    icon: <HomeIcon />, label: 'Home'    },
  { id: 'profile', icon: <StarIcon />, label: 'Profile' },
]

// ─── Pill tab bar ─────────────────────────────────────────────────────────────
function PillTabs({ tabs, active, onChange }) {
  return (
    <div className="flex bg-alt rounded-[10px] p-[3px] mb-3">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex-1 py-[7px] rounded-[8px]
            text-[10px] font-semibold
            cursor-pointer border-0 transition-colors
            ${active === tab.id
              ? 'bg-surface text-accent shadow-sm'
              : 'bg-transparent text-dim'}
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Tab: Stats ───────────────────────────────────────────────────────────────
function StatsTab() {
  return (
    <div className="flex flex-col gap-2">
      {/* Detailed stats 2-col grid */}
      <div className="grid grid-cols-2 gap-2">
        {DETAIL_STATS.map(s => (
          <div key={s.label} className="bg-surface rounded-xl p-2.5 flex items-center gap-2.5 border border-line">
            <span className="text-[18px] leading-none">{s.emoji}</span>
            <div>
              <div className="text-[16px] font-extrabold text-text leading-tight">{s.value}</div>
              <div className="text-[9px] text-dim">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Leagues ─────────────────────────────────────────────────────────────
function LeaguesTab() {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel color="accent">My Leagues</SectionLabel>

      {LEAGUES.map((lg, i) => (
        <div key={i} className="bg-surface rounded-xl px-3.5 py-3 border border-line cursor-pointer active:opacity-80 transition-opacity">
          {/* Name row */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0 mr-2">
              <div className="text-[14px] font-bold text-text">{lg.name}</div>
              <div className="text-[11px] text-dim">Season {lg.season} · {lg.players} players</div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <span className="text-[9px] font-bold text-accent bg-accent/15 px-2 py-[3px] rounded-md">
                {lg.rank}
              </span>
              {lg.role === 'Admin' && (
                <span className="text-[9px] font-bold text-free bg-free/15 px-2 py-[3px] rounded-md">
                  Admin
                </span>
              )}
            </div>
          </div>
          {/* Mini stats */}
          <div className="flex gap-2">
            {[
              { n: lg.wins,         l: 'Wins'        },
              { n: lg.losses,       l: 'Losses'      },
              { n: lg.tournaments,  l: 'Tournaments' },
            ].map(s => (
              <div key={s.l} className="flex-1 bg-bg rounded-lg py-1.5 px-1 text-center">
                <div className="text-[13px] font-bold text-text">{s.n}</div>
                <div className="text-[8px] text-dim">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Join CTA */}
      <button className="w-full border border-dashed border-accent/50 rounded-xl py-3.5 text-[12px] font-semibold text-accent cursor-pointer bg-transparent mt-1">
        + Join a League
      </button>
    </div>
  )
}

// ─── Tab: Match history ───────────────────────────────────────────────────────
function MatchesTab() {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel color="dim">Recent Matches</SectionLabel>

      {MATCHES.map((m, i) => (
        <div key={i} className="bg-surface rounded-xl px-3.5 py-2.5 border border-line cursor-pointer active:opacity-80 transition-opacity">
          {/* Top row: date + tournament + result */}
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-dim">{m.date}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-[2px] rounded
                ${m.type === 'Tournament'
                  ? 'text-accent bg-accent/15'
                  : 'text-free bg-free/15'}`}>
                {m.tourn}
              </span>
            </div>
            <span className={`text-[10px] font-bold ${m.won ? 'text-success' : 'text-error'}`}>
              {m.won ? 'WIN' : 'LOSS'}
            </span>
          </div>
          {/* Score row */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-text flex-1 truncate">{m.t1}</span>
            <div className="flex items-center gap-1 px-2">
              <span className={`text-[16px] font-extrabold ${m.s1 > m.s2 ? 'text-success' : 'text-text'}`}>{m.s1}</span>
              <span className="text-[10px] text-dim">–</span>
              <span className={`text-[16px] font-extrabold ${m.s2 > m.s1 ? 'text-success' : 'text-text'}`}>{m.s2}</span>
            </div>
            <span className="text-[12px] font-semibold text-text flex-1 text-right truncate">{m.t2}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Profile page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('stats')

  const handleNavChange = (tab) => {
    if (tab === 'home') navigate('/')
    else if (tab === 'profile') navigate('/profile')
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pb-6">

          {/* ── Avatar + name row ── */}
          <div className="flex items-center gap-3.5 pt-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-free flex items-center justify-center text-[22px] font-extrabold text-white flex-shrink-0">
              S
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-bold text-text">Santi</div>
              <div className="text-[11px] text-dim">Playing since 2024</div>
            </div>
            <button className="text-dim cursor-pointer bg-transparent border-0 p-1">
              <GearIcon />
            </button>
          </div>

          {/* ── Top stats grid (3 col) ── */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {TOP_STATS.map(s => (
              <div key={s.label} className="bg-surface rounded-xl py-3 px-2 text-center border border-line">
                <div className={`text-[20px] font-extrabold leading-tight ${s.colorClass}`}>{s.value}</div>
                <div className="text-[9px] text-dim mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Pill tabs ── */}
          <PillTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {/* ── Tab content ── */}
          {activeTab === 'stats'   && <StatsTab />}
          {activeTab === 'leagues' && <LeaguesTab />}
          {activeTab === 'matches' && <MatchesTab />}

        </div>
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNav
        items={NAV_ITEMS}
        active="profile"
        onChange={handleNavChange}
      />

    </div>
  )
}
