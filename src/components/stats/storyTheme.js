import {
  Trophy, Flame, Gift, Star, Zap, Target, Repeat, TrendingUp,
  AlertTriangle, Sparkles, Flag, HeartCrack,
} from "lucide-react";

/**
 * Icon/tone maps for the Match Story. The insight engine
 * (src/lib/matchInsights.js) emits string keys so it stays React-free;
 * these maps resolve them to Lucide components and static Tailwind classes
 * (literal strings keep them analyzable by the Tailwind JIT).
 *
 * Shared by MatchStory (full story card) and MatchFinishedScreen (post-match
 * one-liner).
 */

export const ICONS = {
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

export const TONES = {
  success: { chip: "bg-success/15 text-success", card: "bg-gradient-to-br from-success/15 to-surface border-success/40", label: "success" },
  error:   { chip: "bg-error/15 text-error",     card: "bg-gradient-to-br from-error/15 to-surface border-error/40",     label: "dim" },
  accent:  { chip: "bg-accent/15 text-accent",   card: "bg-gradient-to-br from-accent/15 to-surface border-accent/40",   label: "accent" },
  free:    { chip: "bg-free/15 text-free",       card: "bg-gradient-to-br from-free/15 to-surface border-free/40",       label: "free" },
  dim:     { chip: "bg-alt text-dim",            card: "bg-gradient-to-br from-alt/60 to-surface border-line",           label: "dim" },
};
