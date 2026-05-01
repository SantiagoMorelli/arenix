import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { NOTIF_META, formatRelativeTime, markRead, getNotificationTarget } from '../services/notificationService'
import useFocusTrap from '../hooks/useFocusTrap'

const BellEmptyIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
)

export default function NotificationPanel({ isOpen, onClose, notifications = [], onMarkAllRead, onRead }) {
  const navigate      = useNavigate()
  const panelRef      = useRef(null)
  // "Mark all read" button is the preferred initial focus; falls back to the
  // panel itself (tabIndex={-1}) when there are no unread notifications.
  const markAllBtnRef = useRef(null)

  useFocusTrap(panelRef, {
    active: isOpen,
    onEscape: onClose,
    initialFocusRef: notifications.some(n => !n.read) ? markAllBtnRef : panelRef,
  })

  if (!isOpen) return null

  async function handleTap(notif) {
    if (!notif.read) {
      await markRead(notif.id)
      onRead?.(notif.id)
    }
    const target = getNotificationTarget(notif)
    onClose()
    if (target) navigate(target.path, target.state ? { state: target.state } : undefined)
  }

  function handleRowKeyDown(e, notif) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleTap(notif)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        tabIndex={-1}
        className="relative z-10 bg-bg rounded-b-[20px] max-h-[85%] flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.3)] outline-none"
      >

        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-3.5 pb-2.5">
          <span className="text-[16px] font-bold text-text">Notifications</span>
          {notifications.some(n => !n.read) && (
            <button
              ref={markAllBtnRef}
              onClick={onMarkAllRead}
              className="text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-dim">
              <BellEmptyIcon />
              <span className="text-[13px]">No notifications yet</span>
            </div>
          ) : (
            notifications.map(n => {
              const meta = NOTIF_META[n.type] ?? { emoji: '🔔', iconBg: 'bg-alt border border-line' }
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTap(n)}
                  onKeyDown={(e) => handleRowKeyDown(e, n)}
                  className={`flex gap-2.5 px-2 py-2.5 rounded-[10px] mb-0.5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${!n.read ? 'bg-accent/15' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[16px] ${meta.iconBg}`}>
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1.5">
                      <span className={`text-[12px] text-text leading-snug ${!n.read ? 'font-bold' : 'font-medium'}`}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <div className="w-[7px] h-[7px] rounded-full bg-accent flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="text-[11px] text-dim mt-0.5 truncate">{n.body}</div>
                    <div className="text-[9px] text-dim mt-0.5">{formatRelativeTime(n.created_at)}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-3">
          <div className="w-9 h-1 bg-alt rounded-full" />
        </div>

      </div>
    </div>
  )
}
