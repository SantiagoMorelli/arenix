// Props:
//   isOpen  boolean — controls visibility
//   onClose fn      — called when backdrop is tapped

const NOTIFICATIONS = [
  {
    emoji: '🏐',
    title: 'Match starting soon',
    desc: 'Alpha vs Bravo · Spring Cup',
    time: '5 min ago',
    iconBg: 'bg-accent/15 border border-accent/25',
    unread: true,
  },
  {
    emoji: '🏆',
    title: 'Tournament result',
    desc: 'You won Spring Cup Round 1!',
    time: '2h ago',
    iconBg: 'bg-success/15 border border-success/25',
    unread: true,
  },
  {
    emoji: '🤝',
    title: 'League invite',
    desc: 'Carlos invited you to South Beach Open',
    time: '5h ago',
    iconBg: 'bg-free/15 border border-free/25',
    unread: true,
  },
  {
    emoji: '📈',
    title: 'Ranking update',
    desc: 'You moved up to #3 in Miami Beach League',
    time: '1d ago',
    iconBg: 'bg-accent/15 border border-accent/25',
    unread: false,
  },
  {
    emoji: '📋',
    title: 'New match scheduled',
    desc: 'Alpha vs Charlie · Tomorrow 4 PM',
    time: '1d ago',
    iconBg: 'bg-alt border border-line',
    unread: false,
  },
]

export default function NotificationPanel({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">

      {/* ── Backdrop (tap to close) ── */}
      <div
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />

      {/* ── Panel — drops from top ── */}
      <div className="relative z-10 bg-bg rounded-b-[20px] max-h-[85%] flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.3)]">

        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-3.5 pb-2.5">
          <span className="text-[16px] font-bold text-text">Notifications</span>
          <button className="text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0">
            Mark all read
          </button>
        </div>

        {/* Notification list */}
        <div className="overflow-y-auto flex-1 px-3">
          {NOTIFICATIONS.map((n, i) => (
            <div
              key={i}
              className={`flex gap-2.5 px-2 py-2.5 rounded-[10px] mb-0.5 cursor-pointer ${n.unread ? 'bg-accent/15' : ''}`}
            >
              {/* Emoji icon box */}
              <div className={`w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[16px] ${n.iconBg}`}>
                {n.emoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-1.5">
                  <span className={`text-[12px] text-text leading-snug ${n.unread ? 'font-bold' : 'font-medium'}`}>
                    {n.title}
                  </span>
                  {n.unread && (
                    <div className="w-[7px] h-[7px] rounded-full bg-accent flex-shrink-0 mt-1" />
                  )}
                </div>
                <div className="text-[11px] text-dim mt-0.5 truncate">{n.desc}</div>
                <div className="text-[9px] text-dim mt-0.5">{n.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom drag handle */}
        <div className="flex justify-center pt-2 pb-3">
          <div className="w-9 h-1 bg-alt rounded-full" />
        </div>

      </div>
    </div>
  )
}
