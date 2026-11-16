"use client";
/**
 * The call transcript, rendered verbatim. Every evidence quote from the trace is marked in place;
 * quotes belonging to the active claim(s) are highlighted (background AND solid underline).
 * Quotes are never modified: segments are computed from exact positions in the turn text.
 */
import type { WorkspaceView } from "@/product/workspace";
import { cx, initials, SectionLabel } from "./ui";

type Segment = { text: string; claimIds: string[] };

/** Split a turn into plain and evidence segments. Overlapping quotes produce a segment per overlap. */
export function segmentTurn(text: string, quotes: { claimId: string; quote: string }[]): { segments: Segment[]; unlocated: string[] } {
  const ranges: [number, number, string][] = [];
  const unlocated: string[] = [];
  for (const q of quotes) {
    const at = text.indexOf(q.quote);
    if (at === -1) unlocated.push(q.claimId); // grounding normalizes whitespace/quotes; mark the whole turn instead
    else ranges.push([at, at + q.quote.length, q.claimId]);
  }
  const cuts = [...new Set([0, text.length, ...ranges.flatMap(([a, b]) => [a, b])])].sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [a, b] = [cuts[i], cuts[i + 1]];
    const claimIds = [...new Set(ranges.filter(([s, e]) => s <= a && e >= b).map(([, , id]) => id))];
    segments.push({ text: text.slice(a, b), claimIds });
  }
  return { segments, unlocated };
}

export function Transcript({
  view,
  active,
  onHoverClaims,
}: {
  view: WorkspaceView;
  active: Set<string>;
  onHoverClaims: (ids: string[] | null) => void;
}) {
  const people = new Map(view.participants.map((p) => [p.id, p]));
  const quotesByTurn = new Map<string, { claimId: string; quote: string }[]>();
  for (const c of view.claims) for (const q of c.quotes) quotesByTurn.set(q.turnId, [...(quotesByTurn.get(q.turnId) ?? []), { claimId: c.claimId, quote: q.quote }]);

  return (
    <section aria-labelledby="transcript-heading" className="flex min-h-0 flex-col">
      <div className="border-b border-zinc-200 px-5 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel as="h2">
            <span id="transcript-heading">Call transcript</span>
          </SectionLabel>
          <span className="font-mono text-[11px] text-zinc-500">{view.turns.length} turns</span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">{view.scenario.occurredAtText}</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Participants">
          {view.participants.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5 text-xs">
              <span
                className={cx(
                  "grid size-5 place-items-center rounded-full text-[9px] font-semibold",
                  p.side === "customer" ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700",
                )}
                aria-hidden="true"
              >
                {initials(p.name)}
              </span>
              <span className="font-medium text-zinc-800">{p.name}</span>
              <span className="text-zinc-500">{p.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Transcript turns">
        {view.turns.map((t) => {
          const p = people.get(t.speakerId);
          const customer = p?.side === "customer";
          const { segments, unlocated } = segmentTurn(t.text, quotesByTurn.get(t.id) ?? []);
          const turnActive = unlocated.some((id) => active.has(id)) || segments.some((s) => s.claimIds.some((id) => active.has(id)));
          return (
            <li
              key={t.id}
              id={`turn-${t.id}`}
              tabIndex={-1}
              className={cx(
                "group relative rounded-lg px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900/60",
                turnActive ? "bg-white shadow-[0_0_0_1px_rgb(228_228_231)]" : "hover:bg-white/70",
              )}
            >
              {turnActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-500" aria-hidden="true" />}
              <div className="flex items-baseline gap-2">
                <span className={cx("text-[13px] font-semibold", customer ? "text-zinc-900" : "text-zinc-600")}>{p?.name ?? t.speakerId}</span>
                <span
                  className={cx(
                    "rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide",
                    customer ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-600",
                  )}
                >
                  {customer ? "Customer" : "Seller"}
                </span>
                <span className="ml-auto font-mono text-[10px] text-zinc-400">{t.id}</span>
              </div>
              <p className={cx("mt-1 text-[14px] leading-6", customer ? "text-zinc-800" : "text-zinc-600")}>
                {segments.map((s, i) =>
                  s.claimIds.length === 0 ? (
                    <span key={i}>{s.text}</span>
                  ) : (
                    <mark
                      key={i}
                      data-claims={s.claimIds.join(" ")}
                      onMouseEnter={() => onHoverClaims(s.claimIds)}
                      onMouseLeave={() => onHoverClaims(null)}
                      className={cx(
                        "rounded-[3px] text-inherit underline underline-offset-[5px] transition-colors",
                        s.claimIds.some((id) => active.has(id))
                          ? "bg-amber-100 decoration-amber-600 decoration-2 text-zinc-950"
                          : "bg-transparent decoration-zinc-300 decoration-dotted decoration-[1.5px]",
                      )}
                    >
                      {s.text}
                    </mark>
                  ),
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
