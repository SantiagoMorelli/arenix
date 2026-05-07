import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import useFocusTrap from '../hooks/useFocusTrap'

/**
 * QRExportModal
 *
 * Props:
 *   payload        — object to encode in the QR
 *   onClose        — called when the user dismisses without saving the log
 *   onDone         — called when the user taps "Done"; the parent uses this
 *                    hook to save the partial log to Supabase before closing.
 *                    Falls back to onClose if not provided.
 */
export default function QRExportModal({ payload, onClose, onDone }) {
  const data = JSON.stringify(payload)

  const dialogRef  = useRef(null)
  const doneBtnRef = useRef(null)
  useFocusTrap(dialogRef, { onEscape: onClose, initialFocusRef: doneBtnRef })

  const handleDone = () => {
    if (onDone) {
      onDone(onClose)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-export-title"
        className="bg-surface border border-line rounded-2xl p-6 max-w-[320px] w-full text-center shadow-lg"
      >
        <div id="qr-export-title" className="text-[16px] font-bold text-text mb-1">Export Game</div>
        <div className="text-[12px] text-dim mb-5 leading-relaxed">
          Scan this QR with another phone to resume from the current score.
          When you tap Done, the point log is saved so it will be merged into
          the full match stats when the other device finishes the game.
        </div>
        <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-5">
          <QRCodeSVG value={data} size={220} />
        </div>
        <button
          ref={doneBtnRef}
          onClick={handleDone}
          className="w-full py-3 bg-alt border border-line rounded-xl text-[14px] font-bold text-text active:opacity-70"
        >
          Done
        </button>
      </div>
    </div>
  )
}
