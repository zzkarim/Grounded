"use client";
/**
 * Audit trace for one CRM field: every claim the model extracted for it, through each stage of the
 * re-executed pipeline. MODEL steps are what the model produced; CODE steps are what deterministic
 * code checked and decided. The classifier's prose appears only as a subordinate "Model note".
 */
import { useEffect, useRef, type ReactNode } from "react";
import type { CRMField } from "@/core/schemas";
import type { ClaimView, FieldView, WorkspaceView } from "@/product/workspace";
import { ActionBadge, cx, Icon, LaneTag, TONE } from "./ui";
import { presentAction, type Lane } from "@/product/present";

export function AuditDrawer({ view, field, onClose }: { view: WorkspaceView; field: CRMField | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (field && !d.open) d.showModal();
    if (!field && d.open) d.close();
  }, [field]);

  const f = field ? view.fields.find((x) => x.field === field)! : null;
  const claims = f ? orderClaims(view.claims.filter((c) => c.field === f.field), f) : [];

  return (
    <dialog
      ref={ref}
      className="sheet bg-zinc-50 text-zinc-900 shadow-2xl"
      aria-labelledby="drawer-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {f && (
        <div className="flex h-full flex-col">
          <header className="border-b border-zinc-200 bg-white px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Audit trace · {view.scenario.accountName}</p>
                <h2 id="drawer-title" className="mt-1 text-lg font-semibold tracking-tight">
                  {f.label}: {f.action === "ABSTAIN" ? "nothing written" : f.valueText}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close audit trace"
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-zinc-900"
              >
                {Icon.x("size-4")}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ActionBadge p={f.presentation} />
              <span className="text-[13px] text-zinc-700">{f.primary.explanation}</span>
            </div>
            <p className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <LaneTag lane="MODEL" /> produced by the model
              </span>
              <span className="flex items-center gap-1">
                <LaneTag lane="CODE" /> checked or decided by deterministic code
              </span>
            </p>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {claims.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-[13px] text-zinc-700">
                <Step n={1} lane="MODEL" title="Extracted" status="info" last>
                  The model extracted no candidate for this field, so there was nothing to verify. Policy: <strong>Not written</strong> ({f.primary.short}).
                </Step>
              </div>
            ) : (
              claims.map((c) => <ClaimTrace key={c.claimId} c={c} f={f} />)
            )}

            <FieldOutcome f={f} />
            <Provenance view={view} />
          </div>
        </div>
      )}
    </dialog>
  );
}

function orderClaims(claims: ClaimView[], f: FieldView) {
  return [...claims].sort((a, b) => (a.claimId === f.decidingClaimId ? -1 : b.claimId === f.decidingClaimId ? 1 : 0));
}

type Status = "pass" | "fail" | "changed" | "na" | "info";
const STATUS_DOT: Record<Status, string> = {
  pass: "bg-emerald-500",
  fail: "bg-rose-500",
  changed: "bg-amber-500",
  na: "bg-zinc-300",
  info: "bg-zinc-400",
};
const STATUS_TEXT: Record<Status, string> = { pass: "Passed", fail: "Failed", changed: "Detail removed", na: "Not applicable", info: "" };

function Step({ n, lane, title, status, children, last }: { n: number; lane: Lane; title: string; status: Status; children: ReactNode; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[20px_1fr] gap-x-3 pb-4 last:pb-0">
      {!last && <span className="absolute top-6 bottom-0 left-[9.5px] w-px bg-zinc-200" aria-hidden="true" />}
      <span
        className={cx(
          "z-10 mt-0.5 grid size-5 place-items-center rounded-full font-mono text-[10px] font-semibold",
          lane === "MODEL" ? "border border-dashed border-violet-400 bg-violet-50 text-violet-700" : "bg-zinc-900 text-white",
        )}
      >
        {n}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <LaneTag lane={lane} />
          <h4 className="text-[13px] font-semibold text-zinc-900">{title}</h4>
          {status !== "info" && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-600">
              <span className={cx("size-1.5 rounded-full", STATUS_DOT[status])} aria-hidden="true" />
              {STATUS_TEXT[status]}
            </span>
          )}
        </div>
        <div className="mt-1.5 text-[13px] leading-5 text-zinc-700">{children}</div>
      </div>
    </li>
  );
}

function ClaimTrace({ c, f }: { c: ClaimView; f: FieldView }) {
  const finalP = presentAction({ action: c.final.action, reasons: c.final.reasons.map((r) => r.code) });
  const policyP = presentAction({ action: c.policy.action, reasons: c.policy.reasons.map((r) => r.code) });
  const v = c.validation;
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white" aria-label={`Claim ${c.claimId}: ${c.valueText}`}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-zinc-400">{c.claimId}</span>
          <span className="text-[14px] font-semibold text-zinc-900 tabular-nums">{c.valueText}</span>
          {c.claimId === f.decidingClaimId && (
            <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[11px] font-medium text-white">Decides the field</span>
          )}
        </div>
        <ActionBadge p={finalP} size="sm" />
      </header>
      <ol className="px-4 py-4">
        <Step n={1} lane="MODEL" title="Extracted" status="info">
          <p>
            Value: <span className="font-medium text-zinc-900 tabular-nums">{c.extracted.valueText}</span>
          </p>
          <ul className="mt-1.5 space-y-1">
            {c.quotes.map((q) => (
              <li key={q.key} className="rounded-md bg-zinc-50 px-2.5 py-1.5 text-[12px] ring-1 ring-zinc-200 ring-inset">
                <span className="text-zinc-800">“{q.quote}”</span>
                <span className="mt-0.5 block text-[11px] text-zinc-500">
                  {q.speaker} · {q.side === "customer" ? "Customer" : "Seller"} · <span className="font-mono">{q.turnId}</span>
                </span>
              </li>
            ))}
          </ul>
        </Step>

        <Step n={2} lane="CODE" title="Evidence grounded" status={c.grounding.ok ? "pass" : "fail"}>
          <ul className="space-y-0.5">
            {c.grounding.items.map((g, i) => (
              <li key={i} className="flex items-baseline gap-1.5 text-[12px]">
                <span className={g.failure ? "text-rose-600" : "text-emerald-600"} aria-hidden="true">
                  {g.failure ? "✕" : "✓"}
                </span>
                {g.failure ? (
                  <span>Quote {i + 1}: {g.failure.replaceAll("_", " ").toLowerCase()}</span>
                ) : (
                  <span>
                    Quote {i + 1} found verbatim in <span className="font-mono">{g.turnId}</span>, spoken by {g.speaker}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[12px] text-zinc-600">
            {c.grounding.customerEvidence ? "Supported by at least one customer statement." : "No customer statement supports it (seller-only)."}
          </p>
        </Step>

        <Step n={3} lane="CODE" title="Structured value validated" status={!v.applicable ? "na" : v.changed ? "changed" : "pass"}>
          {!v.applicable ? (
            <p className="text-[12px] text-zinc-600">Not applicable. meeting-v1 validates meeting values only.</p>
          ) : v.changed ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
              <ul className="space-y-1">
                {v.issues.map((i, k) => (
                  <li key={k} className="text-[12px]">
                    <span className="flex items-baseline gap-1.5 font-medium text-zinc-900">
                      <span className="text-rose-600" aria-hidden="true">✕</span>
                      {i.label}
                    </span>
                    <span className="ml-4 block font-mono text-[11px] text-zinc-500">{i.rule} · {i.detail}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
                <span className="text-zinc-500">Model value</span>
                <span className="text-zinc-500 tabular-nums line-through">{v.extractedText}</span>
                <span className="text-zinc-500">Kept</span>
                <span className="font-medium text-zinc-900 tabular-nums">{v.keptText}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-600">Validation can only remove unsupported detail. It never adds or corrects a value, and an unverified value can never be written automatically.</p>
            </div>
          ) : (
            <p className="text-[12px] text-zinc-600">Date and time match the quoted words and the call date ({v.keptText}).</p>
          )}
        </Step>

        <Step n={4} lane="MODEL" title="Meaning classified" status={c.classification ? "info" : "fail"}>
          {c.classification ? (
            <>
              <dl className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["Status", c.classification.statusLabel, c.classification.status],
                    ["Certainty", c.classification.certaintyLabel, c.classification.certainty],
                    ["Evidence", c.classification.sufficiencyLabel, c.classification.sufficiency],
                  ] as const
                ).map(([k, label, code]) => (
                  <div key={k} className="rounded-md bg-violet-50/50 px-2 py-1.5 ring-1 ring-violet-200 ring-inset">
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-violet-700">{k}</dt>
                    <dd className="text-[12px] font-medium text-zinc-900">{label}</dd>
                    <dd className="font-mono text-[10px] text-zinc-500">{code}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 border-l-2 border-violet-200 pl-2 text-[12px] leading-4 text-zinc-500 italic">
                <span className="not-italic font-medium text-zinc-500">Model note: </span>
                {c.classification.modelNote}
              </p>
            </>
          ) : (
            <p className="text-[12px]">No valid classification was returned, so the claim can&apos;t be written.</p>
          )}
        </Step>

        <Step n={5} lane="CODE" title="Policy applied" status="info">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBadge p={policyP} size="sm" />
            <span className="text-[12px] text-zinc-600">from the seven ordered rules, for this claim alone</span>
          </div>
          <ReasonList reasons={c.policy.reasons} />
        </Step>

        <Step n={6} lane="CODE" title="Reconciled" status="info" last>
          {c.final.changedByReconciliation ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ActionBadge p={policyP} size="sm" />
                {Icon.arrow("size-3.5 text-zinc-400")}
                <ActionBadge p={finalP} size="sm" />
              </div>
              <ReasonList reasons={c.final.reasons} />
            </>
          ) : (
            <p className="text-[12px] text-zinc-600">
              Unchanged by reconciliation: <span className="font-medium text-zinc-900">{finalP.label}</span>.
            </p>
          )}
        </Step>
      </ol>
    </article>
  );
}

function ReasonList({ reasons }: { reasons: ClaimView["policy"]["reasons"] }) {
  return (
    <ul className="mt-1.5 space-y-0.5">
      {reasons.map((r) => (
        <li key={r.code} className="text-[12px]">
          <span className="font-medium text-zinc-900">{r.short}.</span> <span className="text-zinc-600">{r.explanation}</span>{" "}
          <span className="font-mono text-[10px] text-zinc-400">{r.code}</span>
        </li>
      ))}
    </ul>
  );
}

function FieldOutcome({ f }: { f: FieldView }) {
  return (
    <section className={cx("rounded-xl border p-4", "border-zinc-200 bg-white")} aria-label="Final field decision">
      <div className="flex items-center gap-2">
        <LaneTag lane="CODE" />
        <h3 className="text-[13px] font-semibold">Final field decision</h3>
        <span className="ml-auto">
          <ActionBadge p={f.presentation} size="sm" />
        </span>
      </div>
      <p className="mt-2 text-[13px] text-zinc-700">
        <span className={cx("font-semibold", TONE[f.presentation.tone].text)}>{f.presentation.label}.</span> {f.presentation.crmEffect}
      </p>
      <ReasonList reasons={f.reasons} />
    </section>
  );
}

function Provenance({ view }: { view: WorkspaceView }) {
  const p = view.provenance;
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 text-[12px]" aria-label="Replay provenance">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
        {Icon.shield("size-4 text-emerald-600")} {p.ok ? "Verified replay" : "Replay integrity failure"}
      </h3>
      <p className="mt-1 text-zinc-600">Recorded model responses were fed back through the frozen pipeline. Grounding, validation, policy and reconciliation re-executed, and the decisions matched the recording.</p>
      <h4 className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Recorded model calls</h4>
      <table className="mt-1 w-full text-left tabular-nums">
        <thead className="text-[11px] text-zinc-500">
          <tr>
            <th className="py-1 font-medium">Call</th>
            <th className="py-1 font-medium">Model</th>
            <th className="py-1 text-right font-medium">Tokens in / out</th>
            <th className="py-1 text-right font-medium">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {p.calls.map((c, i) => (
            <tr key={i}>
              <td className="py-1 font-mono text-[11px]">{c.label}</td>
              <td className="py-1">{c.responseModel ?? "—"}</td>
              <td className="py-1 text-right">
                {c.inputTokens?.toLocaleString() ?? "—"} / {c.outputTokens?.toLocaleString() ?? "—"}
              </td>
              <td className="py-1 text-right">{(c.durationMs / 1000).toFixed(1)} s</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-zinc-500">
        Usage and durations are from the original recording ({new Date(p.recordedAt).toUTCString().replace(" GMT", " UTC")}). The replay itself makes no model calls.
      </p>
    </section>
  );
}
