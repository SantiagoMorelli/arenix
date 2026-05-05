/**
 * Headline section: 4 sub-tabs (Serving / Pressure / Strengths / Playstyle),
 * a "View by tournament" drill-down trigger, and a clipboard export button.
 *
 * Help mode: master ? toggle (same pattern as GameStats) shows an InfoPanel
 * describing the section, then passes helpMode down to each panel so they
 * can reveal per-stat explanations.
 */
import { useState } from 'react'
import { Clipboard, ChevronRight } from 'lucide-react'
import { PillTabs, SectionLabel } from '../ui-new'
import { HelpToggle, InfoPanel } from '../stats/StatInfo'
import { PROFILE_EXPLANATIONS } from './profileExplanations'
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

const TAB_EXPLANATION = {
  serving:   PROFILE_EXPLANATIONS.serving,
  pressure:  PROFILE_EXPLANATIONS.pressure,
  strengths: PROFILE_EXPLANATIONS.strengths,
  playstyle: PROFILE_EXPLANATIONS.playstyle,
}

function EmptyState() {
  return (
    <div className="text-center text-[13px] text-dim py-8 border border-dashed border-line rounded-xl">
      Play your first tournament match to unlock stats.
    </div>
  )
}

export default function PlayerStatsSection({ stats, onOpenDrill, onExport }) {
  const [tab, setTab] = useState('serving')
  const [helpMode, setHelpMode] = useState(false)
  const [tabHelpOpen, setTabHelpOpen] = useState(false)
  const hasData = (stats?.totalMatches || 0) > 0

  // Reset the per-tab panel when the master toggle turns off
  function handleHelpToggle(val) {
    setHelpMode(val)
    if (!val) setTabHelpOpen(false)
  }

  // Also reset per-tab panel when switching tabs
  function handleTabChange(id) {
    setTab(id)
    setTabHelpOpen(false)
  }

  return (
    <div className="mb-4">
      {/* Header row: label + ? toggle + copy button */}
      <div className="flex items-center justify-between mb-0">
        <SectionLabel color="free">Player stats</SectionLabel>
        <div className="flex items-center gap-1.5">
          <HelpToggle on={helpMode} onChange={handleHelpToggle} />
          <button
            onClick={onExport}
            aria-label="Copy stats for AI coach"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-free bg-free/15 px-2.5 py-1 rounded-md cursor-pointer border-0"
          >
            <Clipboard size={12} />
            Copy for coach
          </button>
        </div>
      </div>

      {/* Section-level explanation */}
      <InfoPanel open={helpMode && !tabHelpOpen}>
        {PROFILE_EXPLANATIONS.playerStats}
      </InfoPanel>

      <div className="bg-surface border border-line rounded-[14px] p-3 mt-2.5">
        {hasData ? (
          <>
            {/* Sub-tab row + per-tab ? button */}
            <div className="flex items-center gap-1 mb-0">
              <PillTabs
                items={SUB_TABS}
                active={tab}
                onChange={handleTabChange}
                accent="free"
                className="mb-0 flex-1"
              />
              {helpMode && (
                <button
                  type="button"
                  onClick={() => setTabHelpOpen(o => !o)}
                  aria-pressed={tabHelpOpen}
                  aria-label={tabHelpOpen ? 'Hide explanation' : 'Show explanation'}
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none ${
                    tabHelpOpen ? 'bg-text/10 text-text' : 'bg-transparent text-dim/60 hover:text-text'
                  }`}
                >
                  <span className="text-[11px] font-bold leading-none">?</span>
                </button>
              )}
            </div>

            {/* Per-tab explanation panel */}
            <InfoPanel open={helpMode && tabHelpOpen}>
              {TAB_EXPLANATION[tab]}
            </InfoPanel>

            <div className="mt-3">
              {tab === 'serving'    && <ServingPanel    stats={stats.serving}   helpMode={helpMode} />}
              {tab === 'pressure'   && <PressurePanel   stats={stats.pressure}  helpMode={helpMode} />}
              {tab === 'strengths'  && <StrengthsPanel  stats={stats.strengths} helpMode={helpMode} />}
              {tab === 'playstyle'  && <PlaystylePanel  stats={stats.playstyle} helpMode={helpMode} />}
            </div>

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
