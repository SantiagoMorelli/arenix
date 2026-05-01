import { AppBadge } from '../ui-new'

export default function PlayerChip({ player, onRemove, readonly }) {
  return (
    <div className="flex items-center gap-1.5 bg-bg border border-line rounded-full pl-3 pr-1.5 py-1.5 shrink-0">
      <span className="text-[13px] font-semibold text-text leading-none">{player.name}</span>
      {player.isGuest && <AppBadge text="Guest" variant="dim" />}
      {!readonly && (
        <button
          onClick={() => onRemove(player.id)}
          className="w-5 h-5 flex items-center justify-center rounded-full text-dim hover:text-error hover:bg-error/10 transition-colors text-[14px] leading-none bg-transparent border-0 cursor-pointer shrink-0"
          aria-label={`Remove ${player.name}`}
        >
          ×
        </button>
      )}
    </div>
  )
}
