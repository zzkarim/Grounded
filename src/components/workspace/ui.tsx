/** Small presentational primitives shared by the Workspace. No state. */
import type { ReactNode } from "react";
import type { ActionPresentation, Lane, Tone } from "@/product/present";

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export const TONE: Record<Tone, { badge: string; bar: string; text: string; soft: string; ring: string }> = {
  written: { badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/25", bar: "bg-emerald-500", text: "text-emerald-700", soft: "bg-emerald-50/60", ring: "ring-emerald-500/30" },
  review: { badge: "bg-amber-50 text-amber-900 ring-amber-600/30", bar: "bg-amber-500", text: "text-amber-800", soft: "bg-amber-50/70", ring: "ring-amber-500/30" },
  held: { badge: "bg-zinc-100 text-zinc-700 ring-zinc-500/20", bar: "bg-zinc-300", text: "text-zinc-600", soft: "bg-zinc-50", ring: "ring-zinc-400/30" },
  current: { badge: "bg-sky-50 text-sky-800 ring-sky-600/25", bar: "bg-sky-500", text: "text-sky-700", soft: "bg-sky-50/60", ring: "ring-sky-500/30" },
  error: { badge: "bg-rose-50 text-rose-800 ring-rose-600/25", bar: "bg-rose-500", text: "text-rose-700", soft: "bg-rose-50/60", ring: "ring-rose-500/30" },
};

// ───────── Icons (16px, stroke, currentColor) ─────────

const svg = (path: ReactNode, cls = "size-3.5") => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
    {path}
  </svg>
);
export const Icon = {
  check: (c?: string) => svg(<path d="M3.5 8.5l3 3 6-7" />, c),
  review: (c?: string) => svg(<><circle cx="8" cy="8" r="5.75" /><path d="M8 5v3.25M8 10.75v.01" /></>, c),
  dash: (c?: string) => svg(<path d="M4.5 8h7" />, c),
  equals: (c?: string) => svg(<path d="M4.5 6.25h7M4.5 9.75h7" />, c),
  x: (c?: string) => svg(<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />, c),
  arrow: (c?: string) => svg(<path d="M3 8h9.5M9 4.5L12.5 8 9 11.5" />, c),
  chevron: (c?: string) => svg(<path d="M6 3.5L10.5 8 6 12.5" />, c),
  shield: (c?: string) => svg(<><path d="M8 1.75l5 2v4c0 3.1-2.1 5.4-5 6.5-2.9-1.1-5-3.4-5-6.5v-4l5-2z" /><path d="M5.75 8.1l1.6 1.6 2.9-3.2" /></>, c),
  quote: (c?: string) => svg(<path d="M3 9.5c0-2.5 1.2-4 3-4.5M3 9.5h2.5V12H3zM9 9.5c0-2.5 1.2-4 3-4.5M9 9.5h2.5V12H9z" />, c),
  reset: (c?: string) => svg(<><path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.75" /><path d="M2.75 2.75v2.9h2.9" /></>, c),
  trace: (c?: string) => svg(<><circle cx="3.5" cy="4" r="1.25" /><circle cx="3.5" cy="12" r="1.25" /><path d="M3.5 5.25v5.5M6.5 4h7M6.5 8h7M6.5 12h7" /></>, c),
  external: (c?: string) => svg(<path d="M6.5 3.5h-3v9h9v-3M9 3.5h3.5V7M12.5 3.5L7.5 8.5" />, c),
};

const TONE_ICON: Record<Tone, (c?: string) => ReactNode> = {
  written: Icon.check,
  review: Icon.review,
  held: Icon.dash,
  current: Icon.equals,
  error: Icon.x,
};

/** Action badge: icon + text, so meaning never depends on colour alone. */
export function ActionBadge({ p, size = "md" }: { p: ActionPresentation; size?: "sm" | "md" }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-medium ring-1 ring-inset whitespace-nowrap",
        size === "sm" ? "px-1.5 py-px text-[11px]" : "px-2 py-0.5 text-xs",
        TONE[p.tone].badge,
      )}
    >
      {TONE_ICON[p.tone](size === "sm" ? "size-3" : "size-3.5")}
      {p.label}
    </span>
  );
}

/** MODEL (probabilistic, dashed outline) vs CODE (deterministic, solid). Used everywhere stages appear. */
export function LaneTag({ lane, className }: { lane: Lane; className?: string }) {
  return lane === "MODEL" ? (
    <span className={cx("inline-flex items-center rounded border border-dashed border-violet-400 bg-violet-50 px-1 font-mono text-[10px] font-medium tracking-wide text-violet-700", className)}>
      MODEL
    </span>
  ) : (
    <span className={cx("inline-flex items-center rounded border border-zinc-800 bg-zinc-900 px-1 font-mono text-[10px] font-medium tracking-wide text-white", className)}>
      CODE
    </span>
  );
}

export function Chip({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700", className)}>
      {children}
    </span>
  );
}

export function SectionLabel({ children, className, as: As = "h2" }: { children: ReactNode; className?: string; as?: "h2" | "h3" | "p" }) {
  return <As className={cx("text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500", className)}>{children}</As>;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
