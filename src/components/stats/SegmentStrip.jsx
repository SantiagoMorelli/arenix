/**
 * Horizontal strip of small interactive tiles. Used by:
 *   - Match Flow (one tile per point, color = winning team)
 *   - Serve Breakdown (one tile per serve, color = won/lost)
 *
 * Tiles wrap onto multiple rows. Each tile is a real <button> with a hit-slop
 * so the visual stays compact while the touch target stays accessible.
 *
 * Props:
 *   items        Array<{ key, colorClass, ariaLabel, label? }>
 *                  colorClass = Tailwind bg-* class for the tile body
 *                  label      = tiny text shown inside the tile (optional)
 *   selectedKey  string|null  — currently-selected tile key
 *   onSelect     fn(key)      — toggles selection: pass null when deselecting
 *   size         "xs"|"sm"|"md" — tile body size; default "sm"
 *   className    string       — extra classes on the outer wrapper
 */
const SIZES = {
  xs: { tile: "w-[5px] h-[5px] rounded-[1px]", gap: "gap-[2px]", hit: "p-1 -m-1" },
  sm: { tile: "w-2 h-2 rounded-[2px]",          gap: "gap-[3px]", hit: "p-1 -m-1" },
  md: { tile: "w-3 h-3 rounded-[3px]",          gap: "gap-1",     hit: "p-1.5 -m-1.5" },
};

export default function SegmentStrip({
  items,
  selectedKey = null,
  onSelect,
  size = "sm",
  className = "",
}) {
  const s = SIZES[size] ?? SIZES.sm;
  return (
    <div className={`flex flex-wrap ${s.gap} ${className}`}>
      {items.map(it => {
        const isSelected = selectedKey === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onSelect?.(isSelected ? null : it.key)}
            aria-label={it.ariaLabel}
            aria-pressed={isSelected}
            className={`${s.hit} bg-transparent border-0 cursor-pointer flex items-center justify-center focus-visible:outline-none rounded`}
          >
            <span
              className={`${s.tile} ${it.colorClass} block transition-transform duration-150 motion-reduce:transition-none ${isSelected ? "ring-2 ring-text scale-150 z-10 relative" : ""}`}
            >
              {it.label && (
                <span className="text-[7px] font-bold text-white/90 leading-none flex items-center justify-center w-full h-full">
                  {it.label}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
