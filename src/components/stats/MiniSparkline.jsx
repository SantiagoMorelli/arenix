/**
 * Pure inline-SVG line chart. Zero dependencies.
 *
 * Props:
 *   points       number[]   — y values, plotted left→right at equal x intervals
 *   width        number     — px width of the SVG (default 80)
 *   height       number     — px height of the SVG (default 20)
 *   stroke       string     — stroke color (CSS color or `currentColor`); default currentColor
 *   strokeWidth  number     — px stroke width (default 1.5)
 *   baseline     boolean    — draw a centered horizontal baseline (default false)
 *   baselineColor string    — color of the baseline (default currentColor at low opacity via class)
 *   signed       boolean    — when true, treat the y-axis as centered on 0 instead of min/max range
 *   className    string     — wrapper classes
 *   ariaLabel    string     — accessible label
 */
export default function MiniSparkline({
  points,
  width = 80,
  height = 20,
  stroke = "currentColor",
  strokeWidth = 1.5,
  baseline = false,
  signed = false,
  className = "",
  ariaLabel,
}) {
  if (!points || points.length === 0) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }
  if (points.length === 1) {
    const cy = height / 2;
    return (
      <svg width={width} height={height} className={className} aria-label={ariaLabel} role={ariaLabel ? "img" : undefined}>
        <circle cx={width / 2} cy={cy} r={strokeWidth} fill={stroke} />
      </svg>
    );
  }

  const min = signed ? -Math.max(1, ...points.map(Math.abs)) : Math.min(...points);
  const max = signed ?  Math.max(1, ...points.map(Math.abs)) : Math.max(...points);
  const range = max - min || 1;
  const padY = strokeWidth;
  const innerH = height - padY * 2;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const toY = (v) => padY + innerH - ((v - min) / range) * innerH;
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${toY(v).toFixed(2)}`)
    .join(" ");

  const zeroY = signed ? toY(0) : null;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
    >
      {baseline && (
        <line
          x1={0}
          y1={signed ? zeroY : height / 2}
          x2={width}
          y2={signed ? zeroY : height / 2}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeDasharray="2 2"
          strokeWidth={1}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
