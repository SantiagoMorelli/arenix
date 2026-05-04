import { useState, useId } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Inline accordion card. Mirrors the design handoff Free Play "tap row to
 * toggle" pattern: header row + chevron-rotate-180 + height-animated body.
 *
 * Body uses the grid-rows [0fr → 1fr] trick so we can animate height without
 * measuring the child or pulling in a motion library.
 *
 * Props:
 *   header         ReactNode  — collapsed-state content (left of chevron)
 *   children       ReactNode  — expanded-state content (revealed below)
 *   defaultOpen    boolean    — start expanded (default false)
 *   className      string     — extra classes on the outer wrapper
 *   chevronColor   string     — Tailwind color class for the chevron (default text-dim)
 *   ariaLabel      string     — accessible label for the toggle button
 */
export default function ExpandableStatCard({
  header,
  children,
  defaultOpen = false,
  className = "",
  chevronColor = "text-dim",
  ariaLabel,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={ariaLabel}
        className="w-full flex items-stretch gap-2 bg-transparent border-0 p-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[10px]"
      >
        <div className="flex-1 min-w-0">{header}</div>
        <div className="flex items-center pr-1 flex-shrink-0">
          <ChevronDown
            size={16}
            className={`${chevronColor} transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pt-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}
