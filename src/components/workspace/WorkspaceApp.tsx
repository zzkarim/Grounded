"use client";
/**
 * The Workspace: transcript (what was said) → decisions (what Grounded verified and is allowed to do)
 * → CRM + review (what actually changed). All data comes from the verified replay; mock CRM and
 * review state live only in this browser.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CRMField } from "@/core/schemas";
import { demoReducer, initialState, parseStoredState, STORAGE_KEY } from "@/product/demoState";
import type { QuoteView } from "@/product/workspace";
import type { WorkspaceData } from "@/product/workspaceData";
import { AuditDrawer } from "./AuditDrawer";
import { AccountRail, AccountTabs, AppHeader } from "./Chrome";
import { CrmPanel } from "./CrmPanel";
import { DecisionCard } from "./DecisionCard";
import { Ledger } from "./Ledger";
import { PipelineStrip } from "./PipelineStrip";
import { Transcript } from "./Transcript";
import { Icon } from "./ui";

export function WorkspaceApp({ data }: { data: WorkspaceData }) {
  const { view, seeds, nav } = data;
  const fresh = useMemo(() => initialState(seeds), [seeds]);
  const [state, dispatch] = useReducer(demoReducer, fresh);
  const loaded = useRef(false);

  // Restore this browser's mock CRM after hydration (the server always renders the fresh state).
  useEffect(() => {
    const stored = parseStoredState(window.localStorage.getItem(STORAGE_KEY), fresh);
    if (stored) dispatch({ type: "hydrate", state: stored });
    loaded.current = true;
  }, [fresh]);
  useEffect(() => {
    if (loaded.current) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const [hover, setHover] = useState<string[] | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  const active = useMemo(() => new Set(hover ?? pinned), [hover, pinned]);
  const [drawer, setDrawer] = useState<CRMField | null>(null);

  const account = state.accounts[view.scenario.id];
  const pending = Object.fromEntries(Object.entries(state.accounts).map(([id, a]) => [id, a.reviews.filter((r) => r.status === "pending").length]));

  const focusQuote = useCallback((q: QuoteView) => {
    setPinned([q.claimId]);
    const el = document.getElementById(`turn-${q.turnId}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }, []);

  const claimIdsFor = (f: (typeof view.fields)[number]) => (f.decidingClaimId ? [f.decidingClaimId] : f.claimIds);

  return (
    <div className="flex min-h-dvh flex-col xl:h-dvh">
      <AppHeader view={view} onReset={() => dispatch({ type: "reset", seeds })} />
      <AccountTabs nav={nav} current={view.scenario.id} pending={pending} />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(320px,5fr)_minmax(0,7fr)] xl:grid-cols-[208px_minmax(340px,380px)_minmax(0,1fr)_minmax(300px,340px)]">
        <aside className="hidden border-r border-zinc-200 bg-zinc-100/60 xl:block xl:overflow-y-auto">
          <AccountRail nav={nav} current={view.scenario.id} pending={pending} />
        </aside>

        <div className="order-3 border-t border-zinc-200 bg-zinc-50 lg:order-none lg:row-span-2 lg:min-h-0 lg:border-t-0 lg:border-r xl:row-span-1 xl:overflow-hidden">
          <div className="flex h-full max-h-[80dvh] flex-col lg:max-h-none">
            <Transcript view={view} active={active} onHoverClaims={setHover} />
          </div>
        </div>

        <main id="main" className="order-1 min-w-0 space-y-4 px-4 py-4 lg:order-none lg:overflow-y-auto xl:px-5">
          <div>
            <p className="text-[12px] text-zinc-500">
              {view.scenario.segment} · {view.scenario.stage}
            </p>
            <h1 className="mt-0.5 text-[20px] font-semibold tracking-tight text-zinc-950">{view.scenario.accountName}</h1>
            <p className="mt-0.5 text-[13px] text-zinc-600">{view.scenario.title}</p>
          </div>

          <PipelineStrip view={view} />

          {!view.provenance.ok ? (
            <IntegrityFailure problems={view.provenance.problems} />
          ) : (
            <>
              {view.error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
                  <strong>Analysis failed.</strong> Nothing was written to the CRM. ({view.error})
                </div>
              )}
              <section aria-labelledby="decisions-heading">
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 id="decisions-heading" className="text-[13px] font-semibold text-zinc-900">
                    CRM decisions
                  </h2>
                  <span className="text-[11px] text-zinc-500">Hover a decision to see its evidence</span>
                </div>
                <div className="space-y-3">
                  {view.fields.map((f, i) => (
                    <DecisionCard
                      key={f.field}
                      f={f}
                      index={i}
                      review={account.reviews.find((r) => r.field === f.field)}
                      active={claimIdsFor(f).some((id) => active.has(id))}
                      onActivate={(on) => setHover(on ? claimIdsFor(f) : null)}
                      onQuoteClick={focusQuote}
                      onOpenTrace={() => setDrawer(f.field)}
                    />
                  ))}
                </div>
              </section>
              <Ledger view={view} active={active} onActivate={setHover} onOpenTrace={setDrawer} />
            </>
          )}
        </main>

        <aside aria-label="CRM and review" className="order-2 border-t border-zinc-200 bg-zinc-50 px-4 py-4 lg:order-none lg:col-start-2 lg:border-t-0 xl:col-start-auto xl:overflow-y-auto xl:border-l">
          {view.provenance.ok && <CrmPanel view={view} account={account} dispatch={dispatch} onOpenTrace={setDrawer} />}
        </aside>
      </div>

      <AuditDrawer view={view} field={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}

function IntegrityFailure({ problems }: { problems: string[] }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-900">
      <p className="flex items-center gap-1.5 font-semibold">{Icon.x("size-4")} Replay integrity failure</p>
      <p className="mt-1">The recorded model responses didn&apos;t reproduce the recorded decisions through the frozen pipeline, so no decisions are shown and nothing is written.</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 font-mono text-[11px]">
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
