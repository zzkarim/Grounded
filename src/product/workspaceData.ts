/**
 * Server-side loader for the Workspace. Loads the approved scenario and its SELECTED recording,
 * replays it through the frozen pipeline, and builds the view model. Never shipped to the browser.
 */
import { CRM_FIELDS } from "@/core/schemas";
import type { AccountSeed } from "./demoState";
import { loadManifest, loadRecording } from "./recording";
import { replayAnalysis } from "./replay";
import { loadScenarios, SCENARIO_ORDER } from "./scenarios";
import type { DemoScenario } from "./types";
import { buildWorkspaceView, type WorkspaceView } from "./workspace";

export type ScenarioId = (typeof SCENARIO_ORDER)[number];
export const DEFAULT_SCENARIO: ScenarioId = "corrigan";
export const isScenarioId = (x: string): x is ScenarioId => (SCENARIO_ORDER as readonly string[]).includes(x);

export type AccountNav = { id: string; name: string; segment: string; stage: string; pending: number };

export type WorkspaceData = {
  view: WorkspaceView;
  /** Initial CRM + decisions for every account, so Reset can restore all of them. */
  seeds: AccountSeed[];
  nav: AccountNav[];
};

function selectedRecordingFile(scenarioId: string): string {
  const selected = loadManifest().recordings.filter((r) => r.scenarioId === scenarioId && r.selected);
  if (selected.length !== 1) throw new Error(`expected exactly one selected recording for ${scenarioId}, found ${selected.length}`);
  return selected[0].file;
}

async function replayScenario(s: DemoScenario) {
  const rec = loadRecording(selectedRecordingFile(s.id));
  return replayAnalysis(rec, s);
}

export async function loadWorkspaceData(scenarioId: ScenarioId): Promise<WorkspaceData> {
  const scenarios = loadScenarios();
  const replayedAt = new Date().toISOString();
  const outcomes = await Promise.all(scenarios.map(async (s) => ({ s, outcome: await replayScenario(s) })));

  const seeds: AccountSeed[] = outcomes.map(({ s, outcome }) => ({
    scenarioId: s.id,
    crm: s.crm,
    // A failed replay seeds nothing: no decision from an unverified replay reaches the mock CRM.
    decisions: Object.fromEntries(
      CRM_FIELDS.map((f) => {
        const d = outcome.ok && outcome.result ? outcome.result.output.fields[f] : null;
        return [f, d ? { action: d.action, value: d.value ?? null, reasons: d.reasons } : { action: "ABSTAIN", value: null, reasons: ["SYSTEM_ERROR"] }];
      }),
    ) as AccountSeed["decisions"],
  }));

  const nav = outcomes.map(({ s, outcome }) => ({
    id: s.id,
    name: s.account.name,
    segment: s.account.segment,
    stage: s.account.stage,
    pending: outcome.ok && outcome.result ? CRM_FIELDS.filter((f) => outcome.result!.output.fields[f].action === "ASK").length : 0,
  }));

  const current = outcomes.find(({ s }) => s.id === scenarioId)!;
  return { view: buildWorkspaceView(current.s, current.outcome, replayedAt), seeds, nav };
}
