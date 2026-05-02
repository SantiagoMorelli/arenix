import { useEffect, useRef } from 'react'

/**
 * New Tailwind-based UI primitives.
 * These will replace the old inline-style components in ui.jsx (kept untouched for now).
 *
 * Design constants (from CLAUDE.md):
 *   Card:    12px radius · 12px/14px padding · bg-surface border-line
 *   Badge:   10px · uppercase · font-bold · pill
 *   Button:  14px · full-width · rounded-xl · min-h-[44px]
 *   Label:   12px · uppercase · font-bold · tracking-wide
 *   Touch:   min 44px
 */

/* ─── AppCard ─────────────────────────────────────────────────────────────── */
/**
 * Props:
 *   children   ReactNode
 *   className  string   — extra Tailwind classes
 *   onClick    fn       — makes the card clickable
 *   gradient   boolean  — surface→alt diagonal gradient background
 */
export function AppCard({ children, className = '', onClick, gradient = false }) {
  const bg = gradient
    ? 'bg-gradient-to-br from-surface to-alt'
    : 'bg-surface'

  return (
    <div
      className={`${bg} rounded-xl border border-line p-3 ${onClick ? 'cursor-pointer active:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/* ─── AppBadge ────────────────────────────────────────────────────────────── */
/**
 * Props:
 *   text     string
 *   variant  "accent" | "free" | "success" | "error" | "dim"
 */
const BADGE_VARIANTS = {
  accent:  'bg-accent/15 text-accent',
  free:    'bg-free/15 text-free',
  success: 'bg-success/15 text-success',
  error:   'bg-error/15 text-error',
  dim:     'bg-alt text-dim',
}

export function AppBadge({ text, variant = 'dim' }) {
  return (
    <span
      className={`inline-block text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-[3px] rounded-md ${BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.dim}`}
    >
      {text}
    </span>
  )
}

/* ─── AppButton ───────────────────────────────────────────────────────────── */
/**
 * Props:
 *   children  ReactNode
 *   onClick   fn
 *   variant   "accent" | "free" | "success" | "error" | "outline"
 *   disabled  boolean
 *   className string
 */
const BTN_VARIANTS = {
  accent:  'bg-accent text-white hover:bg-accent/90',
  free:    'bg-free text-white hover:bg-free/90',
  success: 'bg-success text-white hover:bg-success/90',
  error:   'bg-error text-white hover:bg-error/90',
  outline: 'border border-line text-text bg-transparent hover:bg-alt',
}

export function AppButton({
  children,
  onClick,
  variant = 'accent',
  disabled = false,
  className = '',
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full min-h-[44px] rounded-xl
        flex items-center justify-center
        text-[14px] font-bold
        transition-opacity
        ${BTN_VARIANTS[variant] ?? BTN_VARIANTS.accent}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  )
}

/* ─── SectionLabel ────────────────────────────────────────────────────────── */
/**
 * Props:
 *   children  ReactNode
 *   color     "dim" | "accent" | "free" | "success"
 */
const LABEL_COLORS = {
  dim:     'text-dim',
  accent:  'text-accent',
  free:    'text-free',
  success: 'text-success',
}

export function SectionLabel({ children, color = 'dim' }) {
  return (
    <div
      className={`text-[12px] font-bold tracking-wide uppercase mb-2.5 ${LABEL_COLORS[color] ?? LABEL_COLORS.dim}`}
    >
      {children}
    </div>
  )
}

/* ─── Label ──────────────────────────────────────────────────────────────── */
/**
 * Accessible form label.
 * Props:
 *   htmlFor   string  — id of the associated input
 *   children  ReactNode
 *   className string  — optional extra classes
 */
export function Label({ htmlFor, children, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-[11px] font-semibold tracking-[0.4px] uppercase text-dim mb-1 block ${className}`}
    >
      {children}
    </label>
  )
}

/* ─── BottomNav ───────────────────────────────────────────────────────────── */
/**
 * Props:
 *   items   Array<{ id: string, icon: ReactNode, label: string }>
 *   active  string   — id of the active tab
 *   onChange  fn(id) — called when a tab is tapped
 */
export function BottomNav({ items, active, onChange }) {
  return (
    <div className="screen__bottom flex border-t border-line bg-surface pt-1.5 pb-0.5">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange?.(item.id)}
          className={`
            flex-1 flex flex-col items-center gap-0.5
            min-h-[44px] py-1
            cursor-pointer bg-transparent border-0
            transition-colors
          `}
        >
          {/* Icon — colour applied by parent via className on the svg */}
          <span className={active === item.id ? 'text-accent' : 'text-dim'}>
            {item.icon}
          </span>
          <span
            className={`text-[10px] font-semibold ${active === item.id ? 'text-accent' : 'text-dim'}`}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ─── PillTabs ────────────────────────────────────────────────────────────── */
/**
 * Pill-style tab switcher (matches wireframe 02 / tournament standings header).
 * Props:
 *   items   Array<{ id: string, label: string }>
 *   active  string   — id of active tab
 *   onChange fn(id)
 *   accent  "accent" | "free"  — highlight color for the active pill (default: accent)
 *   className string  — extra classes for the container (e.g. to override margin)
 */
const PILL_ACTIVE_COLOR = {
  accent: 'text-accent',
  free:   'text-free',
}

export function PillTabs({ items, active, onChange, accent = 'accent', className = 'mx-4 mb-3.5' }) {
  const activeColor = PILL_ACTIVE_COLOR[accent] ?? PILL_ACTIVE_COLOR.accent
  return (
    <div className={`flex bg-alt rounded-[10px] p-[3px] flex-shrink-0 ${className}`}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`
            flex-1 py-2 rounded-lg text-[11px] font-semibold cursor-pointer border-0
            transition-all
            ${active === item.id ? `bg-surface ${activeColor} shadow-sm` : 'bg-transparent text-dim'}
          `}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

/* ─── AppToast ────────────────────────────────────────────────────────────── */
/**
 * Imperative error/success/info toast. Separate from NotificationToast which
 * handles inbound push notifications with tap-to-navigate behaviour.
 *
 * Props:
 *   toast      { id, variant, title, body? } | null
 *     variant  "error" | "success" | "info"
 *   onDismiss  fn — called when the toast auto-dismisses or is tapped
 */
const TOAST_VARIANTS = {
  error:   { icon: '⚠️', chipCls: 'bg-error/15 text-error',   autoDismissMs: 5000 },
  success: { icon: '✓',  chipCls: 'bg-success/15 text-success', autoDismissMs: 3500 },
  info:    { icon: 'ℹ',  chipCls: 'bg-accent/15 text-accent', autoDismissMs: 3500 },
}

export function AppToast({ toast, onDismiss }) {
  const timerRef = useRef(null)
  const visible  = !!toast
  const meta     = toast ? (TOAST_VARIANTS[toast.variant] ?? TOAST_VARIANTS.info) : null

  useEffect(() => {
    if (!toast) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onDismiss, meta.autoDismissMs)
    return () => clearTimeout(timerRef.current)
  }, [toast, onDismiss, meta?.autoDismissMs])

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-[60] transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      {toast && (
        <div
          onClick={onDismiss}
          className="bg-surface border border-line rounded-2xl px-3 py-2.5 flex gap-2.5 items-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] cursor-pointer"
        >
          <div className={`w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[16px] ${meta.chipCls}`}>
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-text leading-snug">{toast.title}</div>
            {toast.body && <div className="text-[11px] text-dim truncate">{toast.body}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── PageHeader ──────────────────────────────────────────────────────────── */
/**
 * Sticky top bar used on detail / profile screens.
 * Props:
 *   title      string
 *   onBack     fn | null  — renders a back chevron when provided
 *   rightSlot  ReactNode  — optional icon button(s) on the right
 */
export function PageHeader({ title, onBack, rightSlot }) {
  return (
    <div className="screen__top flex items-center gap-2 px-4 bg-surface border-b border-line flex-shrink-0 min-h-[52px]">
      {onBack ? (
        <button
          onClick={onBack}
          className="w-[38px] h-[38px] rounded-xl bg-alt flex items-center justify-center cursor-pointer border-0 transition-opacity active:opacity-70 flex-shrink-0"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      ) : (
        <div className="w-[38px] flex-shrink-0" />
      )}
      <span className="flex-1 text-center text-[15px] font-bold text-text tracking-tight">{title}</span>
      {rightSlot ? (
        <div className="flex-shrink-0">{rightSlot}</div>
      ) : (
        <div className="w-[38px] flex-shrink-0" />
      )}
    </div>
  )
}

/* ─── IconButton ──────────────────────────────────────────────────────────── */
/**
 * Props:
 *   children  ReactNode   — icon to display
 *   onClick   fn
 *   badge     number      — optional notification count shown as red dot
 */
export function IconButton({ children, onClick, badge, ariaLabel }) {
  return (
    <div className="relative inline-flex">
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        className="
          w-[38px] h-[38px] rounded-xl
          bg-alt
          flex items-center justify-center
          cursor-pointer border-0
          transition-opacity active:opacity-70
        "
      >
        {children}
      </button>

      {badge != null && badge > 0 && (
        <span
          className="
            absolute -top-1 -right-1
            min-w-[16px] h-4 px-0.5
            rounded-full bg-error
            text-white text-[9px] font-bold
            flex items-center justify-center
          "
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
  )
}
