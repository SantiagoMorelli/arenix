import {
  Trophy, Flame, Gift, Star, Zap, Target, Repeat, TrendingUp,
  AlertTriangle, Sparkles, Flag, HeartCrack,
} from "lucide-react";
import { AppBadge } from "../ui-new";
import { SectionLabelWithHelp } from "./StatInfo";
import { EXPLANATIONS } from "./explanations";

/**
 * Plain-language match summary card. Renders the story object produced by
 * `buildMatchStory` (src/lib/matchInsights.js): a hero result line, up to
 * four insights, and — when the viewer played in the match — a personal
 * "How you played" card.
 *
 * Icon/tone values arrive as string keys so the engine stays React-free;
 * both maps below are static literals to keep Tailwind classes analyzable.
 */

const ICONS = {
  trophy:   Trophy,
  flame:    Flame,
  gift:     Gift,
  star:     Star,
  zap:      Zap,
  target:   Target,
  repeat:   Repeat,
  trendUp:  TrendingUp,
  alert:    AlertTriangle,
  sparkles: Sparkles,
  flag:     Flag,
  heart:    HeartCrack,
};

const TONES = {
  success: { chip: "bg-success/15 text-success", card: "bg-gradient-to-br from-success/15 to-surface border-success/40", label: "success" },
  error:   { chip: "bg-error/15 text-error",     card: "bg-gradient-to-br from-error/15 to-surface border-error/40",     label: "dim" },
  accent:  { chip: "bg-accent/15 text-accent",   card: "bg-gradient-to-br from-accent/15 to-surface border-accent/40",   label: "accent" },
  free:    { chip: "bg-free/15 text-free",       card: "bg-gradient-to-br from-free/15 to-surface border-free/40",       label: "free" },
  dim:     { chip: "bg-alt text-dim",            card: "bg-gradient-to-br from-alt/60 to-surface border-line",           label: "dim" },
};

export default function MatchStory({ story, helpMode = false }) {
  if (!story) return null;
  const { framing, insights, personal, viewerTeam } = story;
  const tone = TONES[framing.tone] ?? TONES.dim;
  const HeroIcon = ICONS[framing.icon] ?? Trophy;

  return (
    <>
      <div className={`border rounded-[14px] px-4 py-4 mb-3 ${tone.card}`}>
        <SectionLabelWithHelp
          color={tone.label}
          helpMode={helpMode}
          explanation={EXPLANATIONS.matchStory}
        >
          Match story
        </SectionLabelWithHelp>

        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${tone.chip}`}>
            <HeroIcon size={18} />
          </div>
          <div className="flex-1 min-w-0 text-[16px] font-bold text-text leading-snug">
            {framing.headline}
          </div>
          <div className={`font-display text-[34px] leading-none flex-shrink-0 ${tone.chip.split(" ")[1]}`}>
            {framing.scoreline}
          </div>
        </div>
        <div className="text-[12px] text-dim leading-relaxed mt-2">
          {framing.detail}
        </div>

        {insights.length > 0 && (
          <div className="border-t border-line mt-3 pt-3 space-y-2.5">
            {insights.map(insight => {
              const iTone = TONES[insight.tone] ?? TONES.dim;
              const Icon = ICONS[insight.icon] ?? Star;
              return (
                <div key={insight.id} className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 ${iTone.chip}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-text leading-snug">{insight.headline}</div>
                    <div className="text-[11px] text-dim leading-relaxed mt-0.5">{insight.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {personal && <HowYouPlayed personal={personal} viewerTeam={viewerTeam} />}
    </>
  );
}

function HowYouPlayed({ personal, viewerTeam }) {
  const tone = viewerTeam === 2 ? TONES.free : TONES.accent;

  const chips = personal.slim
    ? [
        { value: personal.serve.count, label: "Serves" },
        { value: `${personal.serve.pct}%`, label: "Serve wins" },
      ]
    : [
        { value: personal.pts, label: "Points" },
        { value: `${personal.contributionPct}%`, label: "Of team" },
        ...(personal.serve.count > 0
          ? [{ value: `${personal.serve.pct}%`, label: "Serve wins" }]
          : []),
        ...(personal.showErrors
          ? [{ value: personal.errors, label: "Mistakes", valueClass: personal.errors > personal.pts ? "text-error" : "" }]
          : []),
      ];

  return (
    <div className={`border rounded-[14px] px-4 py-3.5 mb-3 ${tone.card}`}>
      <div className={`text-[12px] font-bold tracking-wide uppercase mb-2.5 flex items-center justify-between gap-2 ${tone.label === "free" ? "text-free" : "text-accent"}`}>
        <span>How you played</span>
        {personal.isTopScorer && <AppBadge text="Top scorer" variant="success" />}
      </div>

      <div className="flex gap-2">
        {chips.map(chip => (
          <div key={chip.label} className="flex-1 bg-alt rounded-[10px] py-2 px-1 text-center">
            <div className={`font-display text-[22px] leading-none ${chip.valueClass || "text-text"}`}>
              {chip.value}
            </div>
            <div className="text-[8px] text-dim uppercase mt-1">{chip.label}</div>
          </div>
        ))}
      </div>

      <div className="text-[12px] text-dim italic leading-relaxed mt-2.5">
        {personal.takeaway}
      </div>
    </div>
  );
}
