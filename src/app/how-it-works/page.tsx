import type { Metadata } from "next";
import { HowItWorksView, type InvariantExample } from "@/components/how/HowItWorksView";
import { loadResults } from "@/product/results";
import { loadWorkspaceData } from "@/product/workspaceData";

export const metadata: Metadata = { title: "How it works · Grounded" };

/** Examples come from the verified demo replays; the overwrite count from the stored TEST runs. */
async function getData() {
  "use cache";
  const results = loadResults();
  const [corrigan, meridale, ardent] = await Promise.all([loadWorkspaceData("corrigan"), loadWorkspaceData("meridale"), loadWorkspaceData("ardent")]);
  const field = (d: typeof corrigan, f: string) => d.view.fields.find((x) => x.field === f)!;

  const budget = field(corrigan, "budget");
  const budgetClaim = corrigan.view.claims.find((c) => c.claimId === budget.decidingClaimId);
  const meeting = field(meridale, "nextMeeting");
  const ardentMeeting = ardent.view.claims.find((c) => c.field === "nextMeeting" && c.validation.story);

  const examples: InvariantExample[] = [
    {
      href: "/workspace/corrigan",
      account: corrigan.view.scenario.accountName,
      text: budgetClaim?.classification
        ? `The model labeled ${budget.valueText} as “${budgetClaim.classification.certaintyLabel.toLowerCase()}”. Code turned that label into: ${budget.presentation.label}.`
        : `Code decided: ${budget.presentation.label}.`,
    },
    {
      href: "/workspace/meridale",
      account: meridale.view.scenario.accountName,
      text: meeting.existing
        ? `An agreed move to ${meeting.valueText} would replace ${meeting.existing.text} in the CRM, so it waits for a person.`
        : `Decision: ${meeting.presentation.label}.`,
    },
    {
      href: "/workspace/ardent",
      account: ardent.view.scenario.accountName,
      text: ardentMeeting?.validation.story
        ? `The model resolved “today” to the call date. Code removed ${ardentMeeting.validation.story.removedText} and kept ${ardentMeeting.validation.story.keptText}.`
        : "The meeting value was validated against its quote.",
    },
  ];
  return { examples, overwrites: results.overwrites.cases.length, groundedOverwrites: results.overwrites.groundedOverwrites };
}

export default async function HowItWorksPage() {
  const data = await getData();
  return <HowItWorksView {...data} />;
}
