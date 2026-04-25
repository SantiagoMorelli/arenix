import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRImportModal({ onImport, onClose }) {
  const [error, setError] = useState(null)
  const scannerRef = useRef(null)

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-import-reader', { verbose: false })
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => {
        try {
          const parsed = JSON.parse(text)
          if (typeof parsed.score1 === 'undefined' || !Array.isArray(parsed.log)) {
            setError('Invalid QR code. Please scan an Arenix game export.')
            return
          }
          scanner.stop().catch(() => {})
          onImport(parsed)
        } catch {
          setError('Could not read this QR code. Please try again.')
        }
      },
      () => {}
    ).catch(() => {
      setError('Could not access camera. Please allow camera permission and try again.')
    })

    return () => { scanner.stop().catch(() => {}) }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-line shrink-0">
        <button
          onClick={onClose}
          className="text-[13px] font-bold text-dim border-0 bg-transparent cursor-pointer"
        >
          Cancel
        </button>
        <div className="text-[14px] font-bold text-text">Scan QR Code</div>
        <div className="w-14" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pt-8 px-4">
        <p className="text-[12px] text-dim text-center mb-5 max-w-[280px] leading-relaxed">
          Point the camera at the QR code shown on the scorer's phone to resume the game.
        </p>
        <div id="qr-import-reader" className="w-full max-w-[300px] rounded-xl overflow-hidden" />
        {error && (
          <p className="mt-5 text-[12px] text-error text-center font-medium max-w-[280px]">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
