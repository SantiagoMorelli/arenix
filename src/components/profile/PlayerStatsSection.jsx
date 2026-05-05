/**
 * Headline section: 4 sub-tabs (Serving / Pressure / Strengths / Playstyle),
 * a "View by tournament" drill-down trigger, and a clipboard export button.
 */
import { useState } from 'react'
import { Clipboard, ChevronRight } from 'lucide-react'
import { PillTabs, SectionLabel } from '../ui-new'
import ServingPanel from './panels/ServingPanel'
import PressurePanel from './panels/PressurePanel'
import StrengthsPanel from './panels/StrengthsPanel'
import PlaystylePanel from './panels/PlaystylePanel'

const SUB_TABS = [
  { id: 'serving',    label: 'Serving'    },
  { id: 'pressure',   label: 'Pressure'   },
  { id: 'strengths',  label: 'Strengths'  },
  { id: 'playstyle',  label: 'Playstyle'  },
]

function EmptyState() {
  return (
    <div className="text-center text-[13px] text-dim py-8 border border-dashed border-line rounded-xl">
      Play your first tournament match to unlock stats.
    </div>
  )
}

export default function PlayerStatsSection({ stats, onOpenDrill, onExport }) {
  const [tab, setTab] = useState('serving')
  const hasData = (stats?.totalMatches || 0) > 0

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <SectionLabel color="free">Player stats</SectionLabel>
        <button
          onClick={onExport}
          aria-label="Copy stats for AI coach"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-free bg-free/15 px-2.5 py-1 rounded-md cursor-pointer border-0"
        >
          <Clipboard size={12} />
          Copy for coach
        </button>
      </div>

      <div className="bg-surface border border-line rounded-[14px] p-3">
        {hasData ? (
          <>
            <PillTabs
              items={SUB_TABS}
              active={tab}
              onChange={setTab}
              accent="free"
              className="mb-3"
            />

            {tab === 'serving'    && <ServingPanel    stats={stats.serving} />}
            {tab === 'pressure'   && <PressurePanel   stats={stats.pressure} />}
            {tab === 'strengths'  && <StrengthsPanel  stats={stats.strengths} />}
            {tab === 'playstyle'  && <PlaystylePanel  stats={stats.playstyle} />}

            {(stats.byTournament?.length || 0) > 0 && (
              <button
                onClick={onOpenDrill}
                className="
                  w-full mt-3 flex items-center justify-between
                  bg-alt rounded-xl px-3 py-2.5 cursor-pointer border-0
                  active:opacity-80 transition-opacity
                "
              >
                <span className="text-[12px] font-semibold text-text">
                  View by tournament
                </span>
                <ChevronRight size={16} className="text-dim" />
              </button>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}
