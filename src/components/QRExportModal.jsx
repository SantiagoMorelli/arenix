import { QRCodeSVG } from 'qrcode.react'

export default function QRExportModal({ payload, onClose }) {
  const data = JSON.stringify(payload)

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-surface border border-line rounded-2xl p-6 max-w-[320px] w-full text-center shadow-lg">
        <div className="text-[16px] font-bold text-text mb-1">Export Game</div>
        <div className="text-[12px] text-dim mb-5 leading-relaxed">
          Scan this QR with another phone to resume from the current score.
          Point log and undo history are not transferred.
        </div>
        <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-5">
          <QRCodeSVG value={data} size={220} />
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 bg-alt border border-line rounded-xl text-[14px] font-bold text-text active:opacity-70"
        >
          Done
        </button>
      </div>
    </div>
  )
}
