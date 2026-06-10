import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

/**
 * Help-mode primitives shared across the stats screen.
 *
 *   <HelpToggle on={...} onChange={...} />     ← top-of-stats master toggle
 *   <SectionLabelWithHelp helpMode={...} explanation={...}>Label</…>
 *                                              ← drop-in replacement for
 *                                                <SectionLabel>; renders a
 *                                                small `?` next to the label
 *                                                when help mode is on. Tap
 *                                                to expand the explanation
 *                                                inline. Auto-collapses when
 *                                                help mode flips off.
 *   <HelpInlineButton helpMode={...} open={...} onToggle={...} />
 *                                              ← standalone "?" button for
 *                                                spots that don't use a
 *                                                SectionLabel (centered
 *                                                inline labels, sticky
 *                                                headers, etc.). Pair with
 *                                                an <InfoPanel> rendered
 *                                                wherever the explanation
 *                                                should appear.
 */

export function HelpToggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label={on ? "Hide stat explanations" : "Show stat explanations"}
      title={on ? "Hide explanations" : "What do these stats mean?"}
      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${
        on
          ? "bg-text/10 text-text"
          : "bg-transparent text-dim hover:text-text"
      }`}
    >
      <HelpCircle size={18} />
    </button>
  );
}

const LABEL_COLORS = {
  dim:     "text-dim",
  accent:  "text-accent",
  free:    "text-free",
  success: "text-success",
};

export function SectionLabelWithHelp({
  children, color = "dim", helpMode, explanation,
}) {
  const [open, setOpen] = useState(false);
  const colorClass = LABEL_COLORS[color] ?? LABEL_COLORS.dim;
  const showIcon = helpMode && !!explanation;

  return (
    <>
      <div className={`text-[12px] font-bold tracking-wide uppercase mb-2.5 flex items-center justify-between gap-2 ${colorClass}`}>
        <span>{children}</span>
        {showIcon && (
          <HelpIconButton open={open} onClick={() => setOpen(o => !o)} />
        )}
      </div>
      <InfoPanel open={open && showIcon}>{explanation}</InfoPanel>
    </>
  );
}

function HelpIconButton({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={open}
      aria-label={open ? "Hide explanation" : "Show explanation"}
      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${
        open
          ? "bg-text/10 text-text"
          : "bg-transparent text-dim/60 hover:text-text"
      }`}
    >
      <HelpCircle size={13} />
    </button>
  );
}

/**
 * Animated inline panel — same grid-rows trick used elsewhere in the stats
 * screen. Adds bottom margin only when open so the section spacing is
 * unchanged when help mode is off.
 */
export function InfoPanel({ open, children }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] mb-2.5" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden min-h-0">
        <div className="bg-alt/60 border border-line/60 rounded-[10px] px-3 py-2.5 text-[11px] leading-[1.55] text-dim italic">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact controlled "?" button + panel pair for headers that aren't a
 * SectionLabel (e.g. the "How points were won" centered span, the History
 * tab header, the Match Flow mini-header). Renders nothing when help mode
 * is off.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   useEffect(() => { if (!helpMode) setOpen(false); }, [helpMode]);
 *   ...
 *   <HelpInlineButton helpMode={helpMode} open={open} onToggle={() => setOpen(o => !o)} />
 *   <InfoPanel open={helpMode && open}>{explanation}</InfoPanel>
 */
export function HelpInlineButton({ helpMode, open, onToggle }) {
  if (!helpMode) return null;
  return <HelpIconButton open={open} onClick={onToggle} />;
}

/**
 * One-time discoverability nudge for the help toggle. Screens that own a
 * <HelpToggle> render this right below it, gated by a shared
 * `arenix-help-hint-seen` localStorage flag (via useLocalStorage) so the
 * hint shows once, on whichever stats surface the user opens first.
 */
export function HelpDiscoveryHint({ show, onDismiss }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 bg-alt/60 border border-line/60 rounded-[10px] px-3 py-2 mb-3 text-[11px] text-dim">
      <HelpCircle size={13} className="flex-shrink-0" />
      <span className="flex-1">
        New to volleyball stats? Tap the <span className="font-bold text-text">?</span> above for plain-English explanations.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer bg-transparent text-dim hover:text-text"
      >
        <X size={12} />
      </button>
    </div>
  );
}
