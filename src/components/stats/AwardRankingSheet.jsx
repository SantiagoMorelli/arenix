import { AppSheet } from '../ui-new'

/**
 * AwardRankingSheet — bottom sheet showing the full ranking for one award.
 *
 * Props:
 *   open       boolean
 *   onClose    fn
 *   title      string                 — e.g. "Tip Master"
 *   Icon       lucide component       — same icon used on the award card
 *   funny      boolean                — error-toned styling for negative awards
 *   valueLabel string                 — unit suffix shown after each value
 *   secondaryLabel string?            — unit for the secondary stat (e.g. 'serves')
 *   entries    Array<{ pid, name, value, secondary? }>  — pre-sorted desc
 */
export default function AwardRankingSheet({
  open, onClose, title, Icon, funny = false, valueLabel = '', secondaryLabel = '', entries = [],
}) {
  const accent = funny ? 'text-error' : 'text-accent'
  const accentBg = funny ? 'bg-error/15' : 'bg-accent/15'

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={title}
      icon={Icon ? (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBg}`}>
          <Icon size={18} className={accent} />
        </div>
      ) : null}
    >
      {entries.length === 0 ? (
        <div className="text-[13px] text-dim text-center py-6">
          No qualifying players yet.
        </div>
      ) : (
        <div className="bg-bg rounded-[14px] border border-line overflow-hidden">
          {entries.map((row, i) => (
            <div
              key={row.pid}
              className={`flex items-center px-3.5 py-2.5 ${i < entries.length - 1 ? 'border-b border-line' : ''} ${i === 0 ? accentBg : ''}`}
            >
              <span className={`w-[22px] font-display text-[16px] leading-none ${i === 0 ? accent : 'text-dim'}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
                {row.secondary != null && secondaryLabel && (
                  <div className="text-[10px] text-dim mt-0.5 truncate">
                    {row.secondary} {secondaryLabel}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`font-display text-[20px] leading-none ${i === 0 ? accent : 'text-text'}`}>
                  {row.value}
                </span>
                {valueLabel && (
                  <span className="text-[10px] text-dim ml-1 uppercase tracking-[0.4px]">{valueLabel}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppSheet>
  )
}
