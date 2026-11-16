"use client";
/**
 * "Everything Grounded heard": every candidate claim in the replayed trace (trace.records), and
 * nothing else. Split into claims that drove a CRM decision and claims heard but not written.
 */
import type { CRMField } from "@/core/schemas";
import { presentAction } from "@/product/present";
import type { ClaimView, WorkspaceView } from "@/product/workspace";
import { ActionBadge, cx, SectionLabel } from "./ui";

export function Ledger({
  view,
  active,
  onActivate,
  onOpenTrace,
}: {
  view: WorkspaceView;
  active: Set<string>;
  onActivate: (ids: string[] | null) => void;
  onOpenTrace: (f: CRMField) => void;
}) {
  return (
    <section aria-labelledby="ledger-heading" className="rounded-xl border border-zinc-200 bg-white">
      <header className="flex items-baseline justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <h2 id="ledger-heading" className="text-[13px] font-semibold text-zinc-900">
          Everything Grounded heard
        </h2>
        <span className="text-[11px] text-zinc-500 tabular-nums">
          {view.claims.length} candidate {view.claims.length === 1 ? "claim" : "claims"} from the model
        </span>
      </header>
      <Group title="Used for a CRM decision" compact claims={view.ledger.decision} active={active} onActivate={onActivate} onOpenTrace={onOpenTrace} />
      <Group title="Heard, not written" claims={view.ledger.heard} active={active} onActivate={onActivate} onOpenTrace={onOpenTrace} empty="Every extracted claim was used for a CRM decision." />
      <p className="border-t border-zinc-100 px-4 py-2.5 text-[11px] leading-4 text-zinc-500">
        Grounded only extracts candidates for its three CRM fields. It doesn&apos;t yet capture broader account context. On the held-out benchmark it kept 125/130 CRM-relevant signals but only 6/23 contextual ones.
      </p>
    </section>
  );
}

function Group({
  title,
  claims,
  active,
  onActivate,
  onOpenTrace,
  empty,
  compact = false,
}: {
  compact?: boolean;
  title: string;
  claims: ClaimView[];
  active: Set<string>;
  onActivate: (ids: string[] | null) => void;
  onOpenTrace: (f: CRMField) => void;
  empty?: string;
}) {
  return (
    <div className="px-4 py-3">
      <SectionLabel as="h3" className="mb-2">
        {title} <span className="font-normal text-zinc-400 tabular-nums">· {claims.length}</span>
      </SectionLabel>
      {claims.length === 0 ? (
        <p className="text-[12px] text-zinc-500">{empty}</p>
      ) : (
        <ul className={compact ? "" : "divide-y divide-zinc-100"}>
          {claims.map((c) => {
            const q = c.quotes.find((x) => x.side === "customer") ?? c.quotes[0];
            const on = active.has(c.claimId);
            return (
              <li key={c.claimId}>
                <button
                  type="button"
                  onMouseEnter={() => onActivate([c.claimId])}
                  onMouseLeave={() => onActivate(null)}
                  onFocus={() => onActivate([c.claimId])}
                  onBlur={() => onActivate(null)}
                  onClick={() => onOpenTrace(c.field)}
                  aria-label={`${c.fieldLabel}: ${c.valueText}, ${c.final.label}. ${c.note} Open trace.`}
                  className={cx(
                    "-mx-2 grid w-[calc(100%+1rem)] grid-cols-[96px_1fr_auto] items-start gap-x-3 rounded-md px-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-zinc-900",
                    compact ? "py-1.5" : "py-2",
                    on ? "bg-amber-50/70" : "hover:bg-zinc-50",
                  )}
                >
                  <span className="pt-px text-[11px] font-medium text-zinc-500">{c.fieldLabel}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-zinc-900 tabular-nums">{c.valueText}</span>
                    {!compact && <span className="mt-0.5 block text-[12px] leading-4 text-zinc-600">{c.note}</span>}
                    {q && !compact && (
                      <span className="mt-1 block text-[12px] leading-4 text-zinc-500">
                        “{q.quote}” <span className="text-zinc-400">— {q.speaker}</span>
                      </span>
                    )}
                  </span>
                  <ActionBadge p={presentAction({ action: c.final.action, reasons: c.final.reasons.map((r) => r.code) })} size="sm" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
