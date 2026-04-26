import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { NOTIF_META, getNotificationTarget } from '../services/notificationService'

export default function NotificationToast({ notification, onDismiss }) {
  const navigate = useNavigate()
  const timerRef = useRef(null)

  useEffect(() => {
    if (!notification) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timerRef.current)
  }, [notification, onDismiss])

  const visible = !!notification
  const meta = notification
    ? (NOTIF_META[notification.type] ?? { emoji: '🔔', iconBg: 'bg-alt border border-line' })
    : null

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-[60] transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      {notification && (
        <div
          onClick={() => {
            const target = getNotificationTarget(notification)
            onDismiss()
            if (target) navigate(target.path, target.state ? { state: target.state } : undefined)
          }}
          className="bg-surface border border-line rounded-2xl px-3 py-2.5 flex gap-2.5 items-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] cursor-pointer"
        >
          <div className={`w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[16px] ${meta.iconBg}`}>
            {meta.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-text leading-snug truncate">{notification.title}</div>
            <div className="text-[11px] text-dim truncate">{notification.body}</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
        </div>
      )}
    </div>
  )
}
