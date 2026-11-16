/**
 * The pipeline as it actually ran for this call. MODEL stages (dashed, violet) are probabilistic
 * understanding; CODE stages (solid, dark) are deterministic control. Metrics come from the replay.
 */
import type { WorkspaceView } from "@/product/workspace";
import { cx, LaneTag } from "./ui";

export function PipelineStrip({ view }: { view: WorkspaceView }) {
  return (
    <section aria-labelledby="pipeline-heading" className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-0.5">
        <h2 id="pipeline-heading" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
          How this call was processed
        </h2>
        <p className="flex items-center gap-2.5 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <LaneTag lane="MODEL" /> understands
          </span>
          <span className="flex items-center gap-1">
            <LaneTag lane="CODE" /> verifies &amp; decides
          </span>
        </p>
      </div>
      <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-5" aria-label="Pipeline stages, in order">
        {view.stages.map((s, i) => (
          <li
            key={s.id}
            title={s.detail}
            className={cx(
              "relative flex min-w-0 flex-col rounded-lg px-2.5 pt-2 pb-2.5",
              s.attention
                ? cx("border-amber-400 bg-amber-50/70", s.lane === "MODEL" ? "border border-dashed" : "border")
                : s.lane === "MODEL"
                  ? "border border-dashed border-violet-300 bg-violet-50/40"
                  : "border border-zinc-300 bg-white",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <LaneTag lane={s.lane} />
              <span className="font-mono text-[10px] text-zinc-400" aria-hidden="true">
                {i + 1}
              </span>
            </div>
            <span className="mt-1.5 text-[13px] leading-4 font-semibold text-zinc-900">{s.title}</span>
            <span className={cx("mt-1 text-[11px] leading-[15px] whitespace-pre-line tabular-nums", s.attention ? "font-medium text-amber-800" : "text-zinc-600")}>
              {s.metric}
            </span>
            <span className="sr-only">. {s.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
