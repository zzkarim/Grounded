"use client";
/**
 * One CRM field's decision. The "why" is the deterministic reason-code copy, never the model's prose.
 * Conflicts with the CRM and validator corrections are shown inline because they explain the action.
 */
import type { MeetingValue } from "@/core/schemas";
import type { ReviewItem } from "@/product/demoState";
import { formatDate, formatTime } from "@/product/present";
import type { FieldView, QuoteView } from "@/product/workspace";
import { ActionBadge, Chip, cx, Icon, TONE } from "./ui";

export function DecisionCard({
  f,
  review,
  active,
  index,
  onActivate,
  onQuoteClick,
  onOpenTrace,
}: {
  f: FieldView;
  review: ReviewItem | undefined;
  active: boolean;
  index: number;
  onActivate: (on: boolean) => void;
  onQuoteClick: (q: QuoteView) => void;
  onOpenTrace: () => void;
}) {
  const tone = TONE[f.presentation.tone];
  const empty = f.action === "ABSTAIN";
  // Nothing changes for NO_OP / ABSTAIN, so those cards are compact; attention goes to writes and reviews.
  const compact = f.action === "NO_OP" || f.action === "ABSTAIN";
  return (
    <article
      aria-labelledby={`card-${f.field}`}
      onMouseEnter={() => onActivate(true)}
      onMouseLeave={() => onActivate(false)}
      onFocus={() => onActivate(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && onActivate(false)}
      style={{ animationDelay: `${index * 60}ms` }}
      className={cx(
        "reveal relative overflow-hidden rounded-xl border bg-white transition-shadow",
        active ? "border-zinc-300 shadow-[0_2px_10px_-2px_rgb(0_0_0/0.08)]" : "border-zinc-200 shadow-[0_1px_0_rgb(0_0_0/0.02)]",
      )}
    >
      <span className={cx("absolute inset-y-0 left-0 w-1", tone.bar)} aria-hidden="true" />
      <div className={cx("pr-4 pl-5", compact ? "py-3" : "py-3.5")}>
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={`card-${f.field}`} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {f.label}
            </h3>
            <p className={cx("mt-1 font-semibold tracking-tight tabular-nums", compact ? "text-[16px] leading-5" : "text-[19px] leading-6", empty ? "text-zinc-400" : "text-zinc-950")}>
              {empty ? "Nothing written" : f.valueText}
            </p>
          </div>
          <ActionBadge p={f.presentation} />
        </header>

        {f.conflict && f.existing && (
          <div className="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 rounded-lg bg-amber-50/70 px-3 py-2 text-[13px] ring-1 ring-amber-200 ring-inset">
            <span className="text-[11px] font-medium text-zinc-500">In CRM</span>
            <span className="font-medium text-zinc-900 tabular-nums">{f.existing.text}</span>
            <span className="text-[11px] font-medium text-zinc-500">On this call</span>
            <span className="font-medium text-amber-900 tabular-nums">{f.valueText}</span>
          </div>
        )}

        {f.validatorChange && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 text-[13px]">
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-violet-700">
                <span className="size-1.5 rounded-full border border-dashed border-violet-500" aria-hidden="true" />
                Model extracted
              </span>
              <span className="text-zinc-500 tabular-nums line-through decoration-zinc-400">{f.validatorChange.extractedText}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-900">
                <span className="size-1.5 rounded-full bg-zinc-900" aria-hidden="true" />
                Grounded kept
              </span>
              <span className="font-medium text-zinc-900 tabular-nums">{keptSummary(f)}</span>
            </div>
            <p className="border-t border-zinc-200 px-3 py-1.5 text-[12px] text-zinc-700">
              <span className="font-medium">Check failed:</span> {f.validatorChange.issues.map((i) => i.label).join("; ")}.
            </p>
          </div>
        )}

        <p className={cx("text-[13px] leading-5 text-zinc-700", compact ? "mt-1.5" : "mt-3")}>
          <span className="font-medium text-zinc-900">Why: </span>
          {f.primary.explanation}
        </p>
        {f.secondary.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {f.secondary.map((r) => (
              <Chip key={r.code} title={r.explanation} className="bg-white ring-1 ring-zinc-200 ring-inset">
                + {r.short}
              </Chip>
            ))}
          </div>
        )}

        {f.primaryQuote && compact && (
          <button
            type="button"
            onClick={() => onQuoteClick(f.primaryQuote!)}
            className="mt-1.5 block max-w-full text-left text-[12px] leading-4 text-zinc-600 underline decoration-zinc-300 decoration-dotted underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            “{f.primaryQuote.quote}” <span className="text-zinc-400 no-underline">— {f.primaryQuote.speaker}, <span className="font-mono">{f.primaryQuote.turnId}</span></span>
          </button>
        )}

        {f.primaryQuote && !compact && (
          <button
            type="button"
            onClick={() => onQuoteClick(f.primaryQuote!)}
            className="group mt-3 flex w-full items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-left transition-colors hover:border-zinc-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <span className="mt-0.5 text-zinc-400" aria-hidden="true">
              {Icon.quote()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-5 text-zinc-800">“{f.primaryQuote.quote}”</span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">
                {f.primaryQuote.speaker} · {f.primaryQuote.side === "customer" ? "Customer" : "Seller"} · <span className="font-mono">{f.primaryQuote.turnId}</span>
                <span className="ml-1.5 text-zinc-400 group-hover:text-zinc-700">Show in transcript</span>
              </span>
            </span>
          </button>
        )}

        <footer className={cx("flex items-center justify-between gap-3", compact ? "mt-2" : "mt-3")}>
          <ReviewStatus f={f} review={review} />
          <button
            type="button"
            onClick={onOpenTrace}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-zinc-700 ring-1 ring-zinc-200 transition-colors ring-inset hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            {Icon.trace()} View trace
          </button>
        </footer>
      </div>
    </article>
  );
}

function ReviewStatus({ f, review }: { f: FieldView; review: ReviewItem | undefined }) {
  const base = "text-[12px]";
  if (f.action === "ACT") return <span className={cx(base, "text-emerald-700")}>Written to CRM by Grounded</span>;
  if (f.action === "NO_OP") return <span className={cx(base, "text-sky-700")}>Confirmed on this call · no change</span>;
  if (f.action === "ABSTAIN") return <span className={cx(base, "text-zinc-500")}>CRM unchanged</span>;
  if (!review || review.status === "pending") return <span className={cx(base, "font-medium text-amber-800")}>In review queue · CRM unchanged</span>;
  if (review.status === "approved") return <span className={cx(base, "font-medium text-indigo-700")}>Approved by reviewer{review.edited ? " (edited)" : ""}</span>;
  return <span className={cx(base, "text-zinc-600")}>Rejected by reviewer · CRM unchanged</span>;
}

/** "Date removed · 3:30 PM retained": what validation removed and what it kept, from the kept value itself. */
function keptSummary(f: FieldView): string {
  const removed = f.validatorChange?.removed ?? [];
  const v = f.value as MeetingValue | null;
  const parts: string[] = [];
  if (removed.includes("date")) parts.push("Date removed");
  if (removed.includes("time")) parts.push("Time removed");
  if (v?.date && !removed.includes("date")) parts.push(`${formatDate(v.date)} retained`);
  if (v?.time && !removed.includes("time")) parts.push(`${formatTime(v.time)} retained`);
  return parts.join(" · ");
}
