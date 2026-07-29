export default function DebugStorage() {
  const KEY = 'bv_live_game'
  let data = null
  try { data = JSON.parse(localStorage.getItem(KEY)) } catch { /* ignore */ }

  const copy = () => {
    const text = JSON.stringify(data, null, 2)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
  }

  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity  = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    alert('Copiado al portapapeles')
  }

  const clear = () => {
    if (window.confirm('¿Borrar bv_live_game de localStorage?')) {
      localStorage.removeItem(KEY)
      window.location.reload()
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="bg-surface border border-line rounded-2xl p-6 max-w-sm w-full text-center space-y-3">
          <p className="text-error font-bold text-[16px]">Sin datos</p>
          <p className="text-dim text-[13px] leading-relaxed">
            No se encontró <code className="bg-alt px-1 rounded text-text">bv_live_game</code> en localStorage.<br />
            El partido puede haber sido guardado o el navegador fue cerrado.
          </p>
        </div>
      </div>
    )
  }

  const pointCount = data.log?.length ?? 0
  const setCount   = data.sets?.length ?? 0
  const score1     = data.score1 ?? '?'
  const score2     = data.score2 ?? '?'

  return (
    <div className="min-h-screen bg-bg p-4 space-y-4">
      <div className="bg-surface border border-line rounded-2xl p-4 space-y-1">
        <p className="text-text font-bold text-[15px]">bv_live_game encontrado</p>
        <p className="text-dim text-[13px]">{pointCount} puntos en el log · {setCount} set(s) · Score {score1}–{score2}</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copy}
          className="flex-1 py-3 bg-accent text-white font-bold rounded-xl text-[14px]"
        >
          Copiar JSON
        </button>
        <button
          onClick={clear}
          className="px-4 py-3 bg-error/20 text-error font-bold rounded-xl text-[14px]"
        >
          Borrar
        </button>
      </div>

      <pre className="text-[11px] text-text bg-surface border border-line rounded-xl p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
