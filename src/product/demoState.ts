/**
 * Browser-local mock CRM + embedded review queue (PRODUCT_PLAN.md §10–11). Pure reducer, no I/O.
 *
 * On load, each account's mock CRM starts from the scenario's CRM input, then the replayed field
 * decisions are applied:
 *   ACT     → value written, provenance "Written by Grounded"
 *   ASK     → CRM unchanged; a pending review item is created
 *   NO_OP   → value unchanged; marked "Confirmed on this call"
 *   ABSTAIN → unchanged
 * Reviewer approvals write with provenance "Approved by reviewer", never "Written by Grounded".
 * Replay inputs never change: state only affects this browser's mock CRM.
 */
import { CRM_FIELDS, VALUE_SCHEMAS, type Action, type CRMField, type CRMState, type MeetingValue, type PolicyReason } from "@/core/schemas";

export const STORAGE_KEY = "grounded-demo:v1";

export type Provenance = "initial" | "grounded" | "reviewer";

export type CrmCell = {
  value: unknown | null;
  provenance: Provenance;
  /** NO_OP: the call confirmed the existing value. */
  confirmed: boolean;
  /** Id of a pending review item for this field, if any. */
  pendingReviewId: string | null;
  /** The reviewer edited the proposed value before approving. */
  edited: boolean;
};

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewItem = {
  id: string;
  scenarioId: string;
  field: CRMField;
  proposed: unknown;
  existing: unknown | null;
  reasons: PolicyReason[];
  status: ReviewStatus;
  /** The proposal can't be written as-is (a meeting without a confirmed date). */
  needsCompletion: boolean;
  approvedValue: unknown | null;
  edited: boolean;
};

export type AccountState = { crm: Record<CRMField, CrmCell>; reviews: ReviewItem[] };
export type DemoState = { version: 1; accounts: Record<string, AccountState> };

/** What the replay decided for one account: the only input to its initial state. */
export type AccountSeed = {
  scenarioId: string;
  crm: CRMState;
  decisions: Record<CRMField, { action: Action; value: unknown | null; reasons: PolicyReason[] }>;
};

export const reviewId = (scenarioId: string, field: CRMField) => `${scenarioId}:${field}`;

/** A meeting with no confirmed date can't be written as-is; a person must supply the date. */
export function needsCompletion(field: CRMField, value: unknown): boolean {
  return field === "nextMeeting" && (value as MeetingValue | null)?.date == null;
}

export function canApproveDirectly(item: ReviewItem): boolean {
  return item.status === "pending" && !item.needsCompletion;
}

export function initialAccount(seed: AccountSeed): AccountState {
  const crm = {} as Record<CRMField, CrmCell>;
  const reviews: ReviewItem[] = [];
  for (const f of CRM_FIELDS) {
    const d = seed.decisions[f];
    const existing = seed.crm[f];
    const cell: CrmCell = { value: existing, provenance: "initial", confirmed: false, pendingReviewId: null, edited: false };
    if (d.action === "ACT") {
      cell.value = d.value;
      cell.provenance = "grounded";
    } else if (d.action === "NO_OP") {
      cell.confirmed = true;
    } else if (d.action === "ASK") {
      const id = reviewId(seed.scenarioId, f);
      cell.pendingReviewId = id;
      reviews.push({
        id,
        scenarioId: seed.scenarioId,
        field: f,
        proposed: d.value,
        existing,
        reasons: d.reasons,
        status: "pending",
        needsCompletion: needsCompletion(f, d.value),
        approvedValue: null,
        edited: false,
      });
    }
    crm[f] = cell;
  }
  return { crm, reviews };
}

export function initialState(seeds: AccountSeed[]): DemoState {
  return { version: 1, accounts: Object.fromEntries(seeds.map((s) => [s.scenarioId, initialAccount(s)])) };
}

export type DemoAction =
  | { type: "approve"; id: string }
  | { type: "approveEdited"; id: string; value: unknown }
  | { type: "reject"; id: string }
  | { type: "reset"; seeds: AccountSeed[] }
  | { type: "hydrate"; state: DemoState };

/** Validates an edited value: the field's frozen value schema, and a confirmed date for meetings. */
export function isApprovableValue(field: CRMField, value: unknown): boolean {
  return VALUE_SCHEMAS[field].safeParse(value).success && !needsCompletion(field, value);
}

function resolve(state: DemoState, id: string, status: Exclude<ReviewStatus, "pending">, value: unknown | null, edited: boolean): DemoState {
  const scenarioId = id.split(":")[0];
  const acct = state.accounts[scenarioId];
  const item = acct?.reviews.find((r) => r.id === id);
  if (!acct || !item || item.status !== "pending") return state;

  const reviews = acct.reviews.map((r) => (r.id === id ? { ...r, status, approvedValue: value, edited } : r));
  const cell = acct.crm[item.field];
  const crm = {
    ...acct.crm,
    [item.field]:
      status === "approved"
        ? { value, provenance: "reviewer" as const, confirmed: false, pendingReviewId: null, edited }
        : { ...cell, pendingReviewId: null },
  };
  return { ...state, accounts: { ...state.accounts, [scenarioId]: { crm, reviews } } };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "approve": {
      const item = Object.values(state.accounts).flatMap((a) => a.reviews).find((r) => r.id === action.id);
      if (!item || !canApproveDirectly(item)) return state; // incomplete proposals need Edit & approve
      return resolve(state, action.id, "approved", item.proposed, false);
    }
    case "approveEdited": {
      const item = Object.values(state.accounts).flatMap((a) => a.reviews).find((r) => r.id === action.id);
      if (!item || !isApprovableValue(item.field, action.value)) return state;
      return resolve(state, action.id, "approved", action.value, true);
    }
    case "reject":
      return resolve(state, action.id, "rejected", null, false);
    case "reset":
      return initialState(action.seeds);
    case "hydrate":
      return action.state;
  }
}

/**
 * Accept stored state only if it's this version and covers exactly the current accounts with
 * matching review items; otherwise start fresh. Prevents stale or tampered storage from showing
 * reviews the current replay didn't produce.
 */
export function parseStoredState(raw: string | null, fresh: DemoState): DemoState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as DemoState;
    if (s?.version !== 1 || typeof s.accounts !== "object") return null;
    const ids = Object.keys(fresh.accounts).sort();
    if (JSON.stringify(Object.keys(s.accounts).sort()) !== JSON.stringify(ids)) return null;
    for (const id of ids) {
      const a = s.accounts[id];
      const want = fresh.accounts[id].reviews.map((r) => r.id).sort();
      if (!a?.crm || !Array.isArray(a.reviews) || JSON.stringify(a.reviews.map((r) => r.id).sort()) !== JSON.stringify(want)) return null;
      // Each stored review must still propose exactly what the current replay proposes.
      for (const r of fresh.accounts[id].reviews) {
        const stored = a.reviews.find((x) => x.id === r.id)!;
        if (JSON.stringify(stored.proposed) !== JSON.stringify(r.proposed)) return null;
      }
      if (!CRM_FIELDS.every((f) => a.crm[f] && typeof a.crm[f].provenance === "string")) return null;
    }
    return s;
  } catch {
    return null;
  }
}
