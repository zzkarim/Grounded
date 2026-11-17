/**
 * One meeting-v1 intervention as a sequence: model extracted → code check → failed → kept → removed → final.
 * Validation REMOVES unsupported specificity; it never corrects or adds a value.
 */
import type { ValidatorStory } from "@/product/validatorStory";
import { cx, LaneTag } from "./workspace/ui";

export function ValidatorStoryView({ story, finalLabel, finalDetail, className }: { story: ValidatorStory; finalLabel: string; finalDetail?: string; className?: string }) {
  const row = "grid grid-cols-[132px_1fr] items-baseline gap-x-3 px-3 py-2";
  const label = "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]";
  return (
    <ol className={cx("divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white text-[13px]", className)} aria-label="Validator intervention">
      <li className={row}>
        <span className={cx(label, "text-violet-700")}>
          <LaneTag lane="MODEL" /> Extracted
        </span>
        <span className="font-medium text-zinc-900 tabular-nums">{story.extractedText}</span>
      </li>
      {story.checks.flatMap((c) => [
          <li key={`${c.rule}-check`} className={row}>
            <span className={cx(label, "text-zinc-700")}>
              <LaneTag lane="CODE" /> Check
            </span>
            <span className="text-zinc-800">{c.requirement}</span>
          </li>,
          <li key={`${c.rule}-failed`} className={cx(row, "bg-rose-50/60")}>
            <span className={cx(label, "text-rose-700")}>
              <span aria-hidden="true">✕</span> Failed
            </span>
            <span className="font-medium text-rose-900">
              {c.failure} <span className="ml-1 font-mono text-[10px] font-normal text-rose-700/70">{c.rule}</span>
            </span>
          </li>,
      ])}
      <li className={row}>
        <span className={cx(label, "text-zinc-700")}>Grounded kept</span>
        <span className="font-medium text-zinc-900 tabular-nums">{story.keptText}</span>
      </li>
      <li className={row}>
        <span className={cx(label, "text-zinc-700")}>Grounded removed</span>
        <span className="text-zinc-500 tabular-nums line-through decoration-zinc-400">{story.removedText}</span>
      </li>
      <li className={cx(row, "bg-amber-50/70")}>
        <span className={cx(label, "text-amber-800")}>Final</span>
        <span className="font-semibold text-amber-900">
          {finalLabel}
          {finalDetail && <span className="font-normal text-amber-900/80"> · {finalDetail}</span>}
        </span>
      </li>
    </ol>
  );
}
