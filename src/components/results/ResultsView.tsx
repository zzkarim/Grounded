/**
 * Results: the frozen held-out experiment, presented honestly. Every number comes from ResultsData,
 * which is derived from the stored TEST run files (src/product/results.ts). No number is typed here.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { ResultsData, RatioView, SystemRow } from "@/product/results";
import type { ValidatorStory } from "@/product/validatorStory";
import { ValidatorStoryView } from "../ValidatorStoryView";
import { SiteHeader } from "../workspace/Chrome";
import { cx, Icon, LaneTag } from "../workspace/ui";

type Demo = { story: ValidatorStory; quotes: { quote: string; speaker: string }[]; finalLabel: string; recordingId: string } | null;

const fmtInt = (n: number) => n.toLocaleString("en-US");
const fmtUsd = (n: number) => `≈ $${n.toFixed(2)}`;
const fmtX = (n: number) => `${n.toFixed(1)}×`;

export function ResultsView({ r, demo }: { r: ResultsData; demo: Demo }) {
  const [, self, grounded] = r.systems;
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1120px] px-5 pt-10 pb-20 sm:px-8">
        {/* ───────── Hero ───────── */}
        <header className="max-w-[820px]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Held-out evaluation</p>
          <h1 className="mt-2 text-[30px] leading-[1.15] font-semibold tracking-tight text-zinc-950 sm:text-[36px]">
            Deterministic safeguards reduced unsafe CRM writes without giving up useful automation.
          </h1>
          <p className="mt-3 text-[14px] text-zinc-600">
            {r.transcripts} held-out synthetic sales conversations · {r.items} CRM field decisions · systems frozen before evaluation · single final run
          </p>
          <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-[13px] text-zinc-700">
            <span className="mt-0.5 text-zinc-500">{Icon.review("size-3.5")}</span>
            Grounded&apos;s difference from the self-assessing baseline is small and not conclusive.
          </p>
        </header>

        {/* ───────── Headline table ───────── */}
        <section aria-labelledby="headline" className="mt-8">
          <h2 id="headline" className="sr-only">
            Headline results
          </h2>
          <div role="region" aria-label="Headline results (scrolls horizontally on small screens)" tabIndex={0} className="overflow-x-auto rounded-xl border border-zinc-200 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
            <table className="w-full min-w-[720px] text-left">
              <caption className="sr-only">ACT precision, ACT coverage, unsafe writes and reviews per system on the held-out TEST set</caption>
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  <th scope="col" className="px-5 py-3">System</th>
                  <th scope="col" className="px-4 py-3">
                    ACT precision
                    <span className="block font-normal normal-case tracking-normal text-zinc-400">automatic writes that were correct</span>
                  </th>
                  <th scope="col" className="px-4 py-3">
                    ACT coverage
                    <span className="block font-normal normal-case tracking-normal text-zinc-400">of {r.goldAct} writes that should happen</span>
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Unsafe writes
                    <span className="block font-normal normal-case tracking-normal text-zinc-400">of {r.goldNonAct} items not safe to auto-write</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">Sent to review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {r.systems.map((s) => (
                  <SystemTableRow key={s.system} s={s} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-zinc-500">
            Counts from the stored run files. Re-scoring every stored output with the frozen scoring code reproduces {r.rescore.matched}/{r.rescore.total} outcomes.
          </p>
        </section>

        {/* ───────── Overwrite finding ───────── */}
        <section aria-labelledby="overwrite" className="mt-14">
          <div className="overflow-hidden rounded-2xl bg-zinc-950 text-white">
            <div className="grid gap-8 px-6 pt-8 pb-6 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-[620px]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-amber-300">The clearest finding</p>
                <h2 id="overwrite" className="mt-2 text-[26px] leading-tight font-semibold tracking-tight">
                  The rule the model still broke
                </h2>
                <p className="mt-3 text-[15px] leading-6 text-zinc-300">
                  The self-assessing baseline was explicitly instructed not to auto-write a value that would replace one already in the CRM. On the held-out set it did so anyway, and explained why in its own words. Grounded didn&apos;t, because its deterministic policy makes an autonomous overwrite impossible.
                </p>
              </div>
              <div className="flex gap-3">
                <BigStat n={r.overwrites.cases.length} label="Self-assess autonomous overwrites" tone="warn" />
                <BigStat n={r.overwrites.groundedOverwrites} label="Grounded autonomous overwrites" tone="ok" />
              </div>
            </div>
            <ul className="divide-y divide-white/10 border-t border-white/10">
              {r.overwrites.cases.map((c) => (
                <li key={`${c.caseId}:${c.field}`} className="grid gap-4 px-6 py-5 sm:px-8 lg:grid-cols-[1.1fr_1.4fr_0.9fr]">
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400">
                      {c.fieldLabel} · <span className="font-mono">{c.caseId}</span>
                    </p>
                    <p className="mt-1.5 text-[13px] text-zinc-400">
                      CRM <span className="text-zinc-200 tabular-nums">{c.existingText}</span>
                    </p>
                    <p className="mt-0.5 flex items-baseline gap-1.5 text-[13px] text-zinc-400">
                      <span aria-hidden="true">{Icon.arrow("size-3 inline")}</span>
                      <span className="font-medium text-white tabular-nums">{c.proposedText}</span>
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                      Self-assess
                      <span className="rounded-full bg-rose-500/15 px-2 py-px text-[11px] font-semibold text-rose-300 ring-1 ring-rose-400/30 ring-inset">Auto-write</span>
                    </p>
                    <blockquote title={c.selfReason} className="mt-1.5 border-l-2 border-zinc-700 pl-3 text-[14px] leading-5 text-zinc-200 italic">“{c.selfReasonExcerpt}”</blockquote>
                    <p className="mt-1 text-[11px] text-zinc-500">The model&apos;s own stored reason (excerpt, verbatim)</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                      Grounded
                      <span className="rounded-full bg-amber-400/15 px-2 py-px text-[11px] font-semibold text-amber-200 ring-1 ring-amber-300/30 ring-inset">{c.groundedLabel}</span>
                    </p>
                    <p className="mt-1.5 text-[13px] text-zinc-200">{c.groundedReason}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-500">{c.groundedReasonCode}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="border-t border-white/10 px-6 py-4 text-[12px] leading-5 text-zinc-400 sm:px-8">
              Grounded&apos;s zero overwrites is a property of its policy, not evidence that every possible overwrite case has been tested. The {r.existingCrmTranscripts} held-out conversations with existing CRM state contained {r.overwrites.prefilledFieldItems} pre-filled fields.
            </p>
          </div>
        </section>

        {/* ───────── Validator ───────── */}
        <section aria-labelledby="validator" className="mt-16">
          <SectionHead id="validator" eyebrow="Structured-value validation" title="Ground the quote. Then verify the value.">
            A model can cite exactly the right words and still normalize them into the wrong structured value. Quote grounding can&apos;t catch that, so a second deterministic check compares the value with its own quote. It can only remove detail, never add or correct it.
          </SectionHead>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Panel label="Held-out TEST" tone="test">
              <div className="grid grid-cols-3 gap-3">
                <MiniStat value={`${r.validator.activations} of ${r.validator.meetingCandidates}`} label="meeting candidates where meeting-v1 removed detail" />
                <MiniStat value={String(r.validator.prevented)} label="unsafe write prevented" />
                <MiniStat value={String(r.validator.blocked)} label="correct writes blocked" />
              </div>
              {r.validator.example && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[12px] text-zinc-600">
                    <span className="font-mono text-[11px] text-zinc-500">{r.validator.example.caseId}</span> · evidence: {r.validator.example.quotes.map((q) => `“${q}”`).join(" ")}
                  </p>
                  <ValidatorStoryView story={r.validator.example} finalLabel={r.validator.example.finalLabel} finalDetail="date not confirmed" />
                  <p className="mt-2 text-[11px] leading-4 text-zinc-500">
                    “Prevented” re-runs the frozen policy on the model&apos;s original value with the same labels: it would have been written; the gold label is review.
                    {r.validator.example.alsoWrittenBy.length > 0 && ` ${r.validator.example.alsoWrittenBy.join(" and ")} wrote this date automatically.`}
                  </p>
                </div>
              )}
            </Panel>
            <Panel label="Demo recording · Ardent Biologics" tone="demo">
              {demo ? (
                <>
                  <p className="text-[13px] text-zinc-700">A purpose-built demo call, recorded once through the frozen pipeline. Not benchmark evidence, and not counted in the TEST numbers.</p>
                  <p className="mt-3 mb-1.5 text-[12px] text-zinc-600">
                    evidence: {demo.quotes.map((q) => `“${q.quote}”`).join(" ")}
                  </p>
                  <ValidatorStoryView story={demo.story} finalLabel={demo.finalLabel} finalDetail="human review" />
                  <Link
                    href="/workspace/ardent"
                    className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
                  >
                    Open in Workspace {Icon.arrow("size-3")}
                  </Link>
                </>
              ) : (
                <p className="text-[13px] text-zinc-600">The demo replay is unavailable.</p>
              )}
            </Panel>
          </div>
        </section>

        {/* ───────── Failures ───────── */}
        <section aria-labelledby="failures" className="mt-16">
          <SectionHead id="failures" eyebrow="Honest accounting" title="Where it still breaks">
            Grounded&apos;s remaining errors on the held-out set, every one of them.
          </SectionHead>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <FailureList
              title={`Unsafe writes · ${r.failures.unsafe.length}`}
              subtitle="All were classification errors: the model mislabeled meaning, and the policy faithfully acted on it."
              lane="MODEL"
              stage="Classify"
              items={r.failures.unsafe}
            />
            <FailureList
              title={`Lost correct writes · ${r.failures.lost.length}`}
              subtitle="All were extraction errors: the value was captured wrongly, so it couldn't be written correctly. One was written with the wrong value."
              lane="MODEL"
              stage="Extract"
              items={r.failures.lost}
            />
          </div>
          <p className="mt-6 border-l-4 border-zinc-900 pl-4 text-[19px] leading-7 font-semibold tracking-tight text-zinc-950">
            Deterministic policy can&apos;t recover information the model never represented correctly.
          </p>
        </section>

        {/* ───────── Context ───────── */}
        <section aria-labelledby="context" className="mt-16">
          <SectionHead id="context" eyebrow="What happens to the rest" title="Safe to ignore isn’t the same as safe to forget.">
            Grounded is a CRM write gate, not a complete account memory. It keeps what might change CRM state, including uncertain information for review. Broader context that shouldn&apos;t be written mostly disappears.
          </SectionHead>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <RecallCard title="CRM-relevant signals retained" r={r.recall.crmRelevant} note="Values that could write, need review, or confirm the CRM" good />
            <RecallCard title="Broader contextual signals retained" r={r.recall.contextual} note="Incumbent spend, internal deadlines, historical values, non-decision stakeholders" />
          </div>
          <p className="mt-4 text-[14px] text-zinc-700">
            <span className="font-medium text-zinc-900">Next step:</span> separate broad context extraction from mutation authorization, so useful information survives even when it must never be written.
          </p>
        </section>

        {/* ───────── Cost ───────── */}
        <section aria-labelledby="cost" className="mt-16">
          <SectionHead id="cost" eyebrow="Trade-off" title="Deterministic rules are cheap; the decomposed LLM pipeline is not.">
            Grounded makes two model calls per conversation where self-assess makes one. Most of the measured safety gain came from deterministic code, which costs nothing per call.
          </SectionHead>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-left text-[13px] tabular-nums">
                <thead className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">System</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Model calls</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Tokens in / out</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[self, grounded].map((s) => (
                    <tr key={s.system}>
                      <th scope="row" className="px-4 py-2.5 font-medium text-zinc-900">{s.label}</th>
                      <td className="px-4 py-2.5 text-right">{s.modelCalls}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-700">
                        {fmtInt(s.inputTokens)} / {fmtInt(s.outputTokens)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-zinc-900">{fmtUsd(s.estCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500">
                Grounded vs self-assess: {fmtX(r.ratios.input)} input tokens, {fmtX(r.ratios.output)} output tokens. Costs are estimates at list price for {r.transcripts} conversations, not billed amounts.
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Open question · not tested</p>
              <p className="mt-2 text-[16px] leading-6 font-medium text-zinc-900">Could a one-call extractor plus the same deterministic write gate capture most of the benefit at lower cost?</p>
              <p className="mt-2 text-[13px] text-zinc-600">This experiment didn&apos;t test that architecture. It&apos;s the obvious next comparison.</p>
            </div>
          </div>
        </section>

        {/* ───────── Rigor ───────── */}
        <section aria-labelledby="rigor" className="mt-16">
          <SectionHead id="rigor" eyebrow="Read this before the numbers" title="Provenance and limitations" />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="text-[13px] font-semibold text-zinc-900">Provenance</h3>
              <ul className="mt-3 space-y-2 text-[13px] text-zinc-700">
                <Check>Systems frozen before the held-out set was built or evaluated</Check>
                <Check>Held-out labels frozen ({new Date(r.frozenAt).toISOString().slice(0, 10)}) before any prediction existed</Check>
                <Check>
                  Git tags preserve the order: <span className="font-mono text-[12px]">grounded-v3 → benchmark-test-v1 → experiment-v1-complete</span>
                </Check>
                <Check>
                  An independent re-score matched all {r.rescore.total} stored outcomes; this page re-scores them again ({r.rescore.matched}/{r.rescore.total})
                </Check>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="text-[13px] font-semibold text-zinc-900">Limitations</h3>
              <ul className="mt-3 grid gap-x-5 gap-y-1.5 text-[13px] text-zinc-700 sm:grid-cols-2">
                {[
                  `${r.transcripts} synthetic conversations`,
                  "Claude helped generate the benchmark",
                  "A Claude model was evaluated",
                  "One final stochastic run per system",
                  `Only ${r.goldAct} gold write opportunities`,
                  `Short transcripts (median ${r.medianTurns} turns)`,
                  `${r.multiCustomerTranscripts}/${r.transcripts} with multiple customer speakers`,
                  "Many edge categories appear once",
                  "Grounded vs self-assess gap is noise-sized",
                ].map((l) => (
                  <li key={l} className="flex gap-2">
                    <span className="text-zinc-400" aria-hidden="true">–</span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ───────── Dev history ───────── */}
        <section aria-labelledby="history" className="mt-10">
          <details className="group rounded-xl border border-zinc-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span id="history" className="text-[14px] font-semibold text-zinc-900">
                  What changed during development?
                </span>
                <span className="ml-2 text-[13px] text-zinc-500">How an early “win” turned out to be an unfair comparison</span>
              </span>
              <span className="text-zinc-400 transition-transform group-open:rotate-90">{Icon.chevron("size-4")}</span>
            </summary>
            <ol className="grid gap-px border-t border-zinc-100 bg-zinc-100 sm:grid-cols-5">
              {[
                ["Run 1", "Grounded appeared to have a large coverage advantage."],
                ["Audit", "The comparison was unfair: self-assess hadn't been given all the representation conventions."],
                ["Run 2a", "After aligning the specification for every system, the advantage disappeared."],
                ["v3", "A real normalization failure (a date that contradicted its own quote) motivated deterministic meeting validation."],
                ["TEST", "Architecture frozen; the held-out benchmark was built and evaluated once."],
              ].map(([k, v]) => (
                <li key={k} className="bg-white p-4">
                  <p className="font-mono text-[11px] font-semibold text-zinc-500">{k}</p>
                  <p className="mt-1 text-[13px] leading-5 text-zinc-700">{v}</p>
                </li>
              ))}
            </ol>
          </details>
        </section>

        <footer className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-200 pt-6 text-[13px]">
          <Link href="/workspace/meridale" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
            See overwrite protection in the Workspace
          </Link>
          <Link href="/how-it-works" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
            How it works
          </Link>
          <span className="text-zinc-500">
            Run files: <span className="font-mono text-[12px]">data/runs/test/</span> · full analysis: <span className="font-mono text-[12px]">data/analysis/FINAL_TEST_ANALYSIS.md</span>
          </span>
        </footer>
      </main>
    </div>
  );
}

// ───────── Pieces ─────────

function SystemTableRow({ s }: { s: SystemRow }) {
  const product = s.system === "grounded";
  return (
    <tr className={cx(product && "bg-zinc-50/80")}>
      <th scope="row" className="relative px-5 py-4 align-top">
        {product && <span className="absolute inset-y-0 left-0 w-1 bg-zinc-900" aria-hidden="true" />}
        <span className="block text-[15px] font-semibold text-zinc-950">{s.label}</span>
        <span className="mt-0.5 block text-[12px] font-normal text-zinc-500">{s.blurb}</span>
      </th>
      <MetricCell r={s.actPrecision} product={product} />
      <MetricCell r={s.coverage} product={product} />
      <MetricCell r={s.unsafe} product={product} invert />
      <td className="px-4 py-4 text-right align-top text-[14px] text-zinc-700 tabular-nums">{s.reviews}</td>
    </tr>
  );
}

function MetricCell({ r, product, invert }: { r: RatioView; product: boolean; invert?: boolean }) {
  const width = r.den === 0 ? 0 : (r.num / r.den) * 100;
  return (
    <td className="px-4 py-4 align-top">
      <span className="flex items-baseline gap-2 tabular-nums">
        <span className={cx("text-[17px] font-semibold", product ? "text-zinc-950" : "text-zinc-800")}>{r.pct}</span>
        <span className="text-[12px] text-zinc-500">
          {r.num}/{r.den}
        </span>
      </span>
      <span className="mt-2 block h-1 w-full max-w-[150px] overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
        <span className={cx("block h-full rounded-full", invert ? "bg-rose-400" : product ? "bg-zinc-900" : "bg-zinc-400")} style={{ width: `${width}%` }} />
      </span>
    </td>
  );
}

function BigStat({ n, label, tone }: { n: number; label: string; tone: "warn" | "ok" }) {
  return (
    <div className={cx("w-[150px] rounded-xl px-4 py-3 ring-1 ring-inset", tone === "warn" ? "bg-rose-500/10 ring-rose-400/25" : "bg-emerald-500/10 ring-emerald-400/25")}>
      <p className={cx("text-[40px] leading-none font-semibold tabular-nums", tone === "warn" ? "text-rose-300" : "text-emerald-300")}>{n}</p>
      <p className="mt-2 text-[12px] leading-4 text-zinc-300">{label}</p>
    </div>
  );
}

function SectionHead({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-[760px]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-500">{eyebrow}</p>
      <h2 id={id} className="mt-1.5 text-[24px] leading-tight font-semibold tracking-tight text-zinc-950">
        {title}
      </h2>
      {children && <p className="mt-2 text-[15px] leading-6 text-zinc-600">{children}</p>}
    </div>
  );
}

function Panel({ label, tone, children }: { label: string; tone: "test" | "demo"; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p
        className={cx(
          "mb-4 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]",
          tone === "test" ? "bg-zinc-900 text-white" : "bg-violet-50 text-violet-800 ring-1 ring-violet-200 ring-inset",
        )}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200 ring-inset">
      <p className="text-[20px] leading-none font-semibold text-zinc-950 tabular-nums">{value}</p>
      <p className="mt-1.5 text-[11px] leading-4 text-zinc-600">{label}</p>
    </div>
  );
}

function FailureList({ title, subtitle, lane, stage, items }: { title: string; subtitle: string; lane: "MODEL"; stage: string; items: ResultsData["failures"]["unsafe"] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-zinc-950">{title}</h3>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-500">
            failed at <LaneTag lane={lane} /> {stage}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-zinc-600">{subtitle}</p>
      </div>
      <ul className="divide-y divide-zinc-100">
        {items.map((i) => (
          <li key={i.key} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-2.5 text-[13px]">
            <span className="text-zinc-800">{i.cause}</span>
            <span className="text-right text-[11px] text-zinc-500">
              {i.fieldLabel} · <span className="font-mono">{i.caseId.replace("test-gen-", "#")}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecallCard({ title, r, note, good }: { title: string; r: RatioView; note: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-[13px] font-medium text-zinc-700">{title}</p>
      <p className="mt-2 flex items-baseline gap-2 tabular-nums">
        <span className="text-[34px] leading-none font-semibold text-zinc-950">
          {r.num}
          <span className="text-zinc-400">/{r.den}</span>
        </span>
        <span className="text-[13px] text-zinc-500">{r.pct}</span>
      </p>
      <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
        <span className={cx("block h-full rounded-full", good ? "bg-zinc-900" : "bg-amber-500")} style={{ width: `${(r.num / r.den) * 100}%` }} />
      </span>
      <p className="mt-3 text-[12px] text-zinc-500">{note}</p>
    </div>
  );
}

function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5 text-emerald-600">{Icon.check()}</span>
      <span>{children}</span>
    </li>
  );
}
