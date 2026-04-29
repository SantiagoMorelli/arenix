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

/* ─── IconButton ──────────────────────────────────────────────────────────── */
/**
 * Props:
 *   children  ReactNode   — icon to display
 *   onClick   fn
 *   badge     number      — optional notification count shown as red dot
 */
export function IconButton({ children, onClick, badge }) {
  return (
    <div className="relative inline-flex">
      <button
        onClick={onClick}
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
