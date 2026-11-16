import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceApp } from "@/components/workspace/WorkspaceApp";
import { SCENARIO_ORDER } from "@/product/scenarios";
import { isScenarioId, loadWorkspaceData, type ScenarioId } from "@/product/workspaceData";

type Props = { params: Promise<{ scenario: string }> };

export async function generateStaticParams() {
  return SCENARIO_ORDER.map((scenario) => ({ scenario }));
}

/**
 * Replays the selected recording through the frozen pipeline (server-side) and verifies it.
 * Cached: the inputs (scenario, recording, frozen code) don't change between requests.
 */
async function getWorkspace(id: ScenarioId) {
  "use cache";
  return loadWorkspaceData(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scenario } = await params;
  if (!isScenarioId(scenario)) return {};
  const { view } = await getWorkspace(scenario);
  return { title: `${view.scenario.accountName} · Workspace · Grounded` };
}

export default async function WorkspacePage({ params }: Props) {
  const { scenario } = await params;
  if (!isScenarioId(scenario)) notFound();
  const data = await getWorkspace(scenario);
  return <WorkspaceApp data={data} />;
}
