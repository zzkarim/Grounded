"use client";
/** App header, replay provenance badge and account rail. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AccountNav } from "@/product/workspaceData";
import type { WorkspaceView } from "@/product/workspace";
import { cx, Icon } from "./ui";

export function ProvenanceBadge({ view }: { view: WorkspaceView }) {
  const p = view.provenance;
  return (
    <details className="group relative">
      <summary
        className={cx(
          "flex cursor-pointer list-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 [&::-webkit-details-marker]:hidden",
          p.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-600/25 hover:bg-emerald-100/70" : "bg-rose-50 text-rose-800 ring-rose-600/30",
        )}
      >
        {Icon.shield("size-3.5")}
        <span className="hidden sm:inline">{p.ok ? "Verified replay" : "Replay integrity failure"}</span>
        <span className="sm:hidden">{p.ok ? "Verified" : "Failed"}</span>
        <span className="sr-only">: recorded model responses, deterministic stages re-executed. Show details.</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white p-4 text-[12px] shadow-xl">
        <p className="font-semibold text-zinc-900">{p.ok ? "Recorded model responses; deterministic stages re-executed." : "This replay did not reproduce its recording."}</p>
        {!p.ok && (
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-rose-700">
            {p.problems.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-zinc-700">
          <dt className="text-zinc-500">System</dt>
          <dd>Grounded v{p.systemVersion}</dd>
          <dt className="text-zinc-500">Policy</dt>
          <dd className="font-mono text-[11px]">{p.policyConfig}</dd>
          <dt className="text-zinc-500">Validator</dt>
          <dd className="font-mono text-[11px]">{p.validatorVersion}</dd>
          <dt className="text-zinc-500">Recorded model</dt>
          <dd>
            {p.model} · effort {p.effort}
          </dd>
          <dt className="text-zinc-500">Prompt hashes</dt>
          <dd className="font-mono text-[11px] break-all">
            {Object.entries(p.promptHashes).map(([k, v]) => (
              <span key={k} className="block">
                {k} {v}
              </span>
            ))}
          </dd>
          <dt className="text-zinc-500">Recorded</dt>
          <dd>{new Date(p.recordedAt).toUTCString().replace(" GMT", " UTC")}</dd>
        </dl>
        <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3">
          {[
            [p.ok, "Prompt hashes and versions match the frozen system"],
            [p.ok, "Deterministic stages re-executed on the recorded responses"],
            [p.ok, "Decisions and trace matched the recording"],
          ].map(([ok, label]) => (
            <li key={label as string} className="flex items-center gap-1.5">
              <span className={ok ? "text-emerald-600" : "text-rose-600"} aria-hidden="true">
                {ok ? "✓" : "✕"}
              </span>
              {label as string}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-zinc-500">No model is called when this page loads. Recording: <span className="font-mono">{p.recordingId}</span></p>
      </div>
    </details>
  );
}

const NAV = [
  { href: "/workspace/corrigan", match: "/workspace", label: "Workspace" },
  { href: "/results", match: "/results", label: "Results" },
  { href: "/how-it-works", match: "/how-it-works", label: "How it works" },
];

/** Site header shared by every page. `right` holds page-specific controls. */
export function SiteHeader({ crumb, right }: { crumb?: string; right?: ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur sm:gap-4">
      <Link href="/workspace/corrigan" className="flex shrink-0 items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
        <span className="grid size-6 place-items-center rounded-md bg-zinc-900 text-white" aria-hidden="true">
          {Icon.shield("size-3.5")}
        </span>
        <span className="hidden text-[14px] font-semibold tracking-tight sm:inline">Grounded</span>
      </Link>
      <nav aria-label="Primary" className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-[13px]">
        {NAV.map((n) => {
          const on = pathname.startsWith(n.match);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={cx(
                "shrink-0 rounded-md px-2 py-1 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-zinc-900",
                on ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      {crumb && (
        <>
          <span className="hidden text-[12px] text-zinc-300 lg:inline" aria-hidden="true">
            /
          </span>
          <span className="hidden truncate text-[13px] text-zinc-600 lg:inline">{crumb}</span>
        </>
      )}
      {right && <div className="ml-auto flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

export function AppHeader({ view, onReset }: { view: WorkspaceView; onReset: () => void }) {
  return (
    <SiteHeader
      crumb={view.scenario.accountName}
      right={
        <>
          <ProvenanceBadge view={view} />
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium whitespace-nowrap text-zinc-600 ring-1 ring-zinc-200 transition-colors ring-inset hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            {Icon.reset()} <span className="hidden sm:inline">Reset demo</span>
            <span className="sr-only sm:hidden">Reset demo</span>
          </button>
        </>
      }
    />
  );
}

export function AccountRail({ nav, current, pending }: { nav: AccountNav[]; current: string; pending: Record<string, number> }) {
  return (
    <nav aria-label="Accounts" className="flex flex-col gap-1 p-3">
      <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Recent calls</p>
      {nav.map((a) => {
        const on = a.id === current;
        return (
          <Link
            key={a.id}
            href={`/workspace/${a.id}`}
            aria-current={on ? "page" : undefined}
            className={cx(
              "rounded-lg px-2.5 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-zinc-900",
              on ? "bg-white shadow-[0_0_0_1px_rgb(228_228_231),0_1px_2px_rgb(0_0_0/0.04)]" : "hover:bg-white/60",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={cx("truncate text-[13px] font-medium", on ? "text-zinc-950" : "text-zinc-700")}>{a.name}</span>
              {pending[a.id] > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900 tabular-nums" aria-label={`${pending[a.id]} pending review`}>
                  {pending[a.id]}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{a.stage}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Compact account switcher for narrower screens (the rail is hidden below xl). */
export function AccountTabs({ nav, current, pending }: { nav: AccountNav[]; current: string; pending: Record<string, number> }) {
  return (
    <nav aria-label="Accounts" className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-2 xl:hidden">
      {nav.map((a) => (
        <Link
          key={a.id}
          href={`/workspace/${a.id}`}
          aria-current={a.id === current ? "page" : undefined}
          className={cx(
            "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium focus-visible:outline-2 focus-visible:outline-zinc-900",
            a.id === current ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100",
          )}
        >
          {a.name}
          {pending[a.id] > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-semibold text-zinc-950 tabular-nums">{pending[a.id]}</span>}
        </Link>
      ))}
    </nav>
  );
}
