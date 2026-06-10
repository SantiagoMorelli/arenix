/**
 * Minimal SVG area sparkline for ELO trajectories. Colour follows
 * currentColor, so tint it with a text-* utility on `className`.
 *
 * Props:
 *   points     number[]  — at least 2 values; renders nothing otherwise
 *   className  string    — colour class (default text-accent)
 */
export default function EloSparkline({ points, className = 'text-accent' }) {
  if (!Array.isArray(points) || points.length < 2) return null

  const W = 80
  const H = 60
  const PAD = 4
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W
    const y = PAD + (1 - (p - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = coords.join(' ')
  const area = `${line} ${W},${H} 0,${H}`

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polyline points={area} fill="currentColor" opacity="0.15" stroke="none" />
      <polyline points={line} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
