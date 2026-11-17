"use client";
/**
 * Mock CRM record (browser-local) and the embedded review queue.
 * Provenance is always explicit: Written by Grounded / Confirmed on this call / Pending review /
 * Approved by reviewer. A reviewer approval is never attributed to Grounded.
 */
import { useId, useState } from "react";
import { CRM_FIELDS, type CRMField, type MeetingValue } from "@/core/schemas";
import { canApproveDirectly, isApprovableValue, type AccountState, type CrmCell, type DemoAction, type ReviewItem } from "@/product/demoState";
import { FIELD_LABEL, formatFieldValue, orderReasons, REASON } from "@/product/present";
import type { WorkspaceView } from "@/product/workspace";
import { cx, Icon, SectionLabel } from "./ui";

export function CrmPanel({
  view,
  account,
  dispatch,
  onOpenTrace,
}: {
  view: WorkspaceView;
  account: AccountState;
  dispatch: (a: DemoAction) => void;
  onOpenTrace: (f: CRMField) => void;
}) {
  const pending = account.reviews.filter((r) => r.status === "pending");
  const resolved = account.reviews.filter((r) => r.status !== "pending");
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="crm-heading" className="rounded-xl border border-zinc-200 bg-white">
        <header className="border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="crm-heading" className="text-[13px] font-semibold text-zinc-900">
              CRM record
            </h2>
            <span className="rounded bg-zinc-100 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-zinc-500">Mock · this browser</span>
          </div>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            {view.scenario.accountName} · {view.scenario.stage}
          </p>
        </header>
        <dl className="divide-y divide-zinc-100">
          {CRM_FIELDS.map((f) => (
            <CrmRow key={f} field={f} cell={account.crm[f]} review={account.reviews.find((r) => r.field === f)} />
          ))}
        </dl>
      </section>

      <section aria-labelledby="review-heading" className="rounded-xl border border-zinc-200 bg-white">
        <header className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <h2 id="review-heading" className="text-[13px] font-semibold text-zinc-900">
            Review queue
          </h2>
          <span
            className={cx(
              "rounded-full px-2 py-px text-[11px] font-medium tabular-nums",
              pending.length ? "bg-amber-100 text-amber-900" : "bg-zinc-100 text-zinc-500",
            )}
          >
            {pending.length} pending
          </span>
        </header>
        {pending.length === 0 ? (
          <p className="px-4 py-4 text-[12px] leading-5 text-zinc-500">Nothing waiting. Grounded writes only what it can verify; everything else comes here.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {pending.map((r) => (
              <PendingItem key={r.id} item={r} dispatch={dispatch} onOpenTrace={() => onOpenTrace(r.field)} />
            ))}
          </ul>
        )}
        {resolved.length > 0 && (
          <div className="border-t border-zinc-100 px-4 py-3">
            <SectionLabel as="h3" className="mb-1.5">
              Resolved
            </SectionLabel>
            <ul className="space-y-1">
              {resolved.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-zinc-700">
                    {FIELD_LABEL[r.field]} <span className="text-zinc-400">·</span>{" "}
                    <span className="tabular-nums">{formatFieldValue(r.field, r.status === "approved" ? r.approvedValue : r.proposed)}</span>
                  </span>
                  <span className={cx("shrink-0 font-medium", r.status === "approved" ? "text-indigo-700" : "text-zinc-500")}>
                    {r.status === "approved" ? `Approved${r.edited ? " (edited)" : ""}` : "Rejected"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

const PROVENANCE = {
  grounded: { label: "Written by Grounded", cls: "bg-emerald-50 text-emerald-800 ring-emerald-600/25", icon: Icon.check },
  reviewer: { label: "Approved by reviewer", cls: "bg-indigo-50 text-indigo-800 ring-indigo-600/25", icon: Icon.check },
  confirmed: { label: "Confirmed on this call", cls: "bg-sky-50 text-sky-800 ring-sky-600/25", icon: Icon.equals },
  pending: { label: "Pending review", cls: "bg-amber-50 text-amber-900 ring-amber-600/30", icon: Icon.review },
  initial: { label: "From CRM", cls: "bg-zinc-50 text-zinc-600 ring-zinc-500/20", icon: Icon.dash },
};

function CrmRow({ field, cell, review }: { field: CRMField; cell: CrmCell; review: ReviewItem | undefined }) {
  const kind = cell.pendingReviewId ? "pending" : cell.provenance === "grounded" ? "grounded" : cell.provenance === "reviewer" ? "reviewer" : cell.confirmed ? "confirmed" : cell.value === null ? null : "initial";
  const p = kind ? PROVENANCE[kind] : null;
  return (
    <div className="px-4 py-3">
      <dt className="text-[11px] font-medium text-zinc-500">{FIELD_LABEL[field]}</dt>
      <dd className="mt-0.5">
        <span className={cx("block text-[14px] font-semibold tabular-nums", cell.value === null ? "font-normal text-zinc-400" : "text-zinc-900")}>
          {cell.value === null ? "Empty" : formatFieldValue(field, cell.value)}
        </span>
        {p && (
          <span className={cx("mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-medium ring-1 ring-inset", p.cls)}>
            {p.icon("size-3")}
            {p.label}
            {kind === "reviewer" && cell.edited && " · edited"}
          </span>
        )}
        {kind === "pending" && review && (
          <span className="mt-1.5 flex items-baseline gap-1.5 text-[12px] text-amber-900">
            <span className="text-zinc-500">Proposed:</span>
            <span className="font-medium tabular-nums">{formatFieldValue(field, review.proposed)}</span>
          </span>
        )}
      </dd>
    </div>
  );
}

function PendingItem({ item, dispatch, onOpenTrace }: { item: ReviewItem; dispatch: (a: DemoAction) => void; onOpenTrace: () => void }) {
  const [editing, setEditing] = useState(false);
  const reasons = orderReasons(item.reasons);
  const lead = REASON[reasons[0]];
  return (
    <li className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-zinc-500">{FIELD_LABEL[item.field]}</span>
        <button type="button" onClick={onOpenTrace} className="text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-zinc-900">
          Trace
        </button>
      </div>
      <p className="mt-0.5 text-[14px] font-semibold text-zinc-900 tabular-nums">{formatFieldValue(item.field, item.proposed)}</p>
      {item.existing !== null && (
        <p className="mt-0.5 text-[12px] text-zinc-500">
          Would replace <span className="font-medium text-zinc-700 tabular-nums">{formatFieldValue(item.field, item.existing)}</span>
        </p>
      )}
      <p className="mt-1.5 text-[12px] leading-4 text-zinc-700">{lead.explanation}</p>

      {editing ? (
        <EditMeeting item={item} dispatch={dispatch} onCancel={() => setEditing(false)} />
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {canApproveDirectly(item) ? (
            <button type="button" onClick={() => dispatch({ type: "approve", id: item.id })} className={BTN.primary}>
              Approve
            </button>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className={BTN.primary}>
              Edit &amp; approve
            </button>
          )}
          <button type="button" onClick={() => dispatch({ type: "reject", id: item.id })} className={BTN.secondary}>
            Reject
          </button>
          <span className="text-[11px] text-zinc-500">
            {canApproveDirectly(item) ? "Writes as reviewer-approved" : "Needs a confirmed date first"}
          </span>
        </div>
      )}
    </li>
  );
}

const BTN = {
  primary:
    "inline-flex min-h-8 items-center rounded-md bg-zinc-900 px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-300",
  secondary:
    "inline-flex min-h-8 items-center rounded-md bg-white px-3 py-1 text-[12px] font-medium text-zinc-800 ring-1 ring-zinc-300 transition-colors ring-inset hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900",
};

/** Meetings without a confirmed date: the reviewer must supply the date before anything is written. */
function EditMeeting({ item, dispatch, onCancel }: { item: ReviewItem; dispatch: (a: DemoAction) => void; onCancel: () => void }) {
  const proposed = item.proposed as MeetingValue;
  const [date, setDate] = useState(proposed.date ?? "");
  const [time, setTime] = useState(proposed.time ?? "");
  const id = useId();
  const value: MeetingValue = { ...proposed, date: date || null, time: time || null };
  const ok = isApprovableValue(item.field, value);
  return (
    <form
      className="mt-2.5 rounded-lg bg-zinc-50 p-2.5 ring-1 ring-zinc-200 ring-inset"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) dispatch({ type: "approveEdited", id: item.id, value });
      }}
    >
      <p className="text-[11px] leading-4 text-zinc-600">
        Grounded couldn&apos;t verify a date (“{proposed.asStated}”). Confirm it before writing.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label htmlFor={`${id}-d`} className="text-[11px] font-medium text-zinc-600">
          Date <span className="text-rose-600">*</span>
          <input id={`${id}-d`} type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5 block w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900 focus:border-zinc-900 focus:outline-none" />
        </label>
        <label htmlFor={`${id}-t`} className="text-[11px] font-medium text-zinc-600">
          Time
          <input id={`${id}-t`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-0.5 block w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900 focus:border-zinc-900 focus:outline-none" />
        </label>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button type="submit" disabled={!ok} className={BTN.primary}>
          Approve with date
        </button>
        <button type="button" onClick={onCancel} className={BTN.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
