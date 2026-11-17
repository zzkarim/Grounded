/**
 * How it works: the architecture in one picture, three invariants, and why prompting alone wasn't enough.
 * Stage order matches src/systems/grounded.ts exactly (validation runs BEFORE classification).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "../workspace/Chrome";
import { ActionBadge, cx, Icon, LaneTag } from "../workspace/ui";
import { ACTION } from "@/product/present";

export type InvariantExample = { href: string; account: string; text: string };

const STEPS: { n: number; lane: "MODEL" | "CODE"; title: string; detail: string }[] = [
  { n: 1, lane: "MODEL", title: "Extract candidates + evidence", detail: "Every value the call might support, each with exact quotes, including negated, past and hedged ones." },
  { n: 2, lane: "CODE", title: "Ground evidence", detail: "Each quote must appear verbatim in the cited turn, from the cited speaker." },
  { n: 3, lane: "CODE", title: "Validate structured values", detail: "A meeting date and time must match their own quote and fall after the call. Unsupported detail is removed." },
  { n: 4, lane: "MODEL", title: "Classify meaning", detail: "Current or past? Stated or hedged? Does it establish the field? Labels only, never an action." },
  { n: 5, lane: "CODE", title: "Apply write policy", detail: "Seven ordered rules turn labels, grounding, validation and the existing CRM value into an action." },
  { n: 6, lane: "CODE", title: "Reconcile candidates", detail: "Competing values for one field become one decision; conflicts go to review." },
];

export function HowItWorksView({ examples, overwrites, groundedOverwrites }: { examples: InvariantExample[]; overwrites: number; groundedOverwrites: number }) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-[1120px] px-5 pt-10 pb-20 sm:px-8">
        <header className="max-w-[760px]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Architecture</p>
          <h1 className="mt-2 text-[32px] leading-[1.12] font-semibold tracking-tight text-zinc-950 sm:text-[40px]">Probabilistic understanding. Deterministic control.</h1>
          <p className="mt-3 text-[16px] leading-7 text-zinc-600">The model proposes what a sales call means. Code decides what is allowed to change customer state.</p>
        </header>

        {/* ───────── Two-lane pipeline ───────── */}
        <section aria-labelledby="pipeline" className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8">
          <h2 id="pipeline" className="sr-only">
            Pipeline, in execution order
          </h2>
          {/* Desktop: swimlane. Columns are execution order; rows are MODEL vs CODE. */}
          <div className="hidden grid-cols-[132px_repeat(6,minmax(0,1fr))] gap-x-2.5 gap-y-2.5 lg:grid">
            <div />
            {STEPS.map((s) => (
              <div key={s.n} className="flex items-center gap-2" aria-hidden="true">
                <StepDot s={s} />
                {s.n < STEPS.length && (
                  <span className="flex flex-1 items-center text-zinc-300">
                    <span className="h-px flex-1 bg-zinc-200" />
                    {Icon.chevron("size-3 -ml-1")}
                  </span>
                )}
              </div>
            ))}
            {(["MODEL", "CODE"] as const).map((lane) => [
              <LaneHeader key={`${lane}-h`} lane={lane} title={lane === "MODEL" ? "Model" : "Code"} subtitle={lane === "MODEL" ? "Probabilistic understanding" : "Deterministic, unit-tested control"} />,
              ...STEPS.map((s) =>
                s.lane === lane ? (
                  <StepCard key={`${lane}-${s.n}`} s={s} />
                ) : (
                  <div key={`${lane}-${s.n}`} className={cx("rounded-xl", lane === "MODEL" ? "bg-violet-50/30" : "bg-zinc-50")} aria-hidden="true" />
                ),
              ),
            ])}
          </div>
          {/* Small screens: the same order as a list. */}
          <ol className="space-y-2 lg:hidden">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-3">
                <StepDot s={s} />
                <div className="min-w-0 flex-1">
                  <LaneTag lane={s.lane} className="mb-1" />
                  <StepCard s={s} />
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 border-t border-zinc-100 pt-5">
            <p className="text-center text-[12px] text-zinc-500">One decision per CRM field</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {(["ACT", "ASK", "ABSTAIN", "NO_OP"] as const).map((a) => (
                <ActionBadge key={a} p={ACTION[a]} />
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Invariants ───────── */}
        <section aria-labelledby="invariants" className="mt-14">
          <h2 id="invariants" className="text-[24px] font-semibold tracking-tight text-zinc-950">
            Three invariants, enforced in code
          </h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              ["The model never chooses the final action.", "It labels meaning. Seven ordered rules decide Written, Needs review, Not written or Already current."],
              ["Existing CRM state is never overwritten autonomously.", "A supported value that differs from the CRM always goes to a person, however explicit it is."],
              ["Validation can remove unsupported specificity, never add it.", "If a value's detail isn't supported by its quote, that detail is removed and the value can't be auto-written."],
            ].map(([title, body], i) => (
              <article key={title} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5">
                <span className="grid size-7 place-items-center rounded-full bg-zinc-900 font-mono text-[12px] font-semibold text-white">{i + 1}</span>
                <h3 className="mt-3 text-[16px] leading-6 font-semibold text-zinc-950">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-5 text-zinc-600">{body}</p>
                {examples[i] && (
                  <Link
                    href={examples[i].href}
                    className="group mt-4 block rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200 transition-colors ring-inset hover:bg-white hover:ring-zinc-300 focus-visible:outline-2 focus-visible:outline-zinc-900"
                  >
                    <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                      See it · {examples[i].account}
                      <span className="text-zinc-400 group-hover:text-zinc-900">{Icon.arrow("size-3.5")}</span>
                    </span>
                    <span className="mt-1 block text-[13px] leading-5 text-zinc-800">{examples[i].text}</span>
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* ───────── Why not just prompt ───────── */}
        <section aria-labelledby="why" className="mt-14 grid gap-6 rounded-2xl bg-zinc-950 p-6 text-white sm:p-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Why not just prompt the model?</p>
            <h2 id="why" className="mt-2 text-[34px] leading-none font-semibold tracking-tight">We did.</h2>
          </div>
          <div className="space-y-3 text-[15px] leading-6 text-zinc-300">
            <p>
              The self-assessing baseline was told, in its prompt, not to auto-write a value that replaces one already in the CRM. On the held-out set it still did, <span className="font-semibold text-white">{overwrites} times</span>, with reasons that acknowledged the replacement. Grounded&apos;s count was {groundedOverwrites}, because its policy can&apos;t express that action.
            </p>
            <p className="text-[18px] leading-7 font-semibold text-white">Instructions are probabilistic. Invariants can be deterministic.</p>
            <p className="text-[13px] text-zinc-400">
              Not every instruction belongs in code. Meaning (is this hedged? is this person the signer?) still needs the model. The rules that must always hold don&apos;t.{" "}
              <Link href="/results" className="font-medium text-white underline decoration-zinc-600 underline-offset-4 hover:decoration-white">
                See the evidence
              </Link>
            </p>
          </div>
        </section>

        {/* ───────── Trust layer concept ───────── */}
        <section aria-labelledby="gate" className="mt-14">
          <h2 id="gate" className="text-[24px] font-semibold tracking-tight text-zinc-950">
            A write gate between understanding and state
          </h2>
          <p className="mt-2 max-w-[700px] text-[15px] leading-6 text-zinc-600">What the model knows is kept as evidence. What it may do to the CRM is decided separately.</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-6">
              <FlowNode>Sales conversation</FlowNode>
              <Down />
              <FlowNode lane="MODEL">Model understanding</FlowNode>
              <Down />
              <div className="w-full max-w-[420px] rounded-xl bg-zinc-900 px-4 py-3 text-center text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Grounded</p>
                <p className="text-[15px] font-semibold">Write gate</p>
              </div>
              <Down />
              <div className="grid w-full max-w-[460px] grid-cols-3 gap-2">
                {[
                  ["Write", "Written", "bg-emerald-50 text-emerald-900 ring-emerald-200"],
                  ["Human review", "Needs review", "bg-amber-50 text-amber-900 ring-amber-200"],
                  ["No mutation", "Not written · Already current", "bg-zinc-50 text-zinc-800 ring-zinc-200"],
                ].map(([t, s, c]) => (
                  <div key={t} className={cx("rounded-lg px-2 py-2.5 text-center ring-1 ring-inset", c)}>
                    <p className="text-[13px] font-semibold">{t}</p>
                    <p className="mt-0.5 text-[11px] opacity-75">{s}</p>
                  </div>
                ))}
              </div>
              <Down />
              <FlowNode>CRM state</FlowNode>
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-dashed border-violet-300 bg-violet-50/40 p-6">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-800">
                <LaneTag lane="MODEL" /> Evidence &amp; extracted context
              </p>
              <p className="mt-2 text-[16px] leading-6 font-semibold text-zinc-950">What the model knows</p>
              <p className="mt-1.5 text-[13px] leading-5 text-zinc-600">
                Every candidate, with its quote and labels, stays in the audit trace, including values that were never written. Today that covers the three CRM fields only; broader account context is future work.
              </p>
              <p className="mt-4 text-[16px] leading-6 font-semibold text-zinc-950">What it may do</p>
              <p className="mt-1.5 text-[13px] leading-5 text-zinc-600">Decided by the gate, never by the model.</p>
            </div>
          </div>
        </section>

        <footer className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-200 pt-6 text-[13px]">
          <Link href="/workspace/corrigan" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
            Open the Workspace
          </Link>
          <Link href="/results" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
            Results
          </Link>
          <span className="text-zinc-500">
            Code: <span className="font-mono text-[12px]">src/systems/grounded.ts · src/core/policy.ts · src/core/validation.ts</span>
          </span>
        </footer>
      </main>
    </div>
  );
}

function LaneHeader({ lane, title, subtitle }: { lane: "MODEL" | "CODE"; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col justify-center gap-1 py-2">
      <LaneTag lane={lane} className="self-start" />
      <p className="text-[15px] font-semibold text-zinc-950">{title}</p>
      <p className="text-[12px] text-zinc-500">{subtitle}</p>
    </div>
  );
}

function StepCard({ s }: { s: (typeof STEPS)[number] }) {
  return (
    <div className={cx("h-full rounded-xl px-3.5 py-3", s.lane === "MODEL" ? "border border-dashed border-violet-300 bg-violet-50/50" : "border border-zinc-300 bg-white shadow-[0_1px_0_rgb(0_0_0/0.03)]")}>
      <p className="text-[14px] font-semibold text-zinc-950">
        <span className="sr-only">
          Step {s.n}, {s.lane === "MODEL" ? "model" : "code"}:{" "}
        </span>
        {s.title}
      </p>
      <p className="mt-1 text-[12px] leading-[17px] text-zinc-600">{s.detail}</p>
    </div>
  );
}

function FlowNode({ children, lane }: { children: ReactNode; lane?: "MODEL" }) {
  return (
    <div
      className={cx(
        "w-full max-w-[320px] rounded-lg px-4 py-2 text-center text-[13px] font-medium",
        lane === "MODEL" ? "border border-dashed border-violet-300 bg-violet-50/50 text-zinc-900" : "border border-zinc-200 bg-zinc-50 text-zinc-800",
      )}
    >
      {children}
    </div>
  );
}

function Down() {
  return (
    <span className="text-zinc-300" aria-hidden="true">
      {Icon.arrow("size-4 rotate-90")}
    </span>
  );
}

function StepDot({ s }: { s: (typeof STEPS)[number] }) {
  return (
    <span
      className={cx(
        "grid size-7 shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold",
        s.lane === "MODEL" ? "border border-dashed border-violet-400 bg-violet-50 text-violet-700" : "bg-zinc-900 text-white",
      )}
      aria-hidden="true"
    >
      {s.n}
    </span>
  );
}
