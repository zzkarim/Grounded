import type { Metadata } from "next";
import { ResultsView } from "@/components/results/ResultsView";
import { loadResults } from "@/product/results";
import { loadWorkspaceData } from "@/product/workspaceData";

export const metadata: Metadata = {
  title: "Results",
  description: "Held-out evaluation of Grounded against naive and self-assessing LLM baselines on 60 frozen synthetic sales conversations.",
};

/** Everything on this page is derived from the committed TEST run files and the selected demo replay. */
async function getData() {
  "use cache";
  const results = loadResults();
  const ardent = await loadWorkspaceData("ardent");
  const meeting = ardent.view.claims.find((c) => c.field === "nextMeeting" && c.validation.story);
  const field = ardent.view.fields.find((f) => f.field === "nextMeeting")!;
  return {
    results,
    demo:
      meeting && meeting.validation.story && ardent.view.provenance.ok
        ? {
            story: meeting.validation.story,
            quotes: meeting.quotes.map((q) => ({ quote: q.quote, speaker: q.speaker })),
            finalLabel: field.presentation.label,
            recordingId: ardent.view.provenance.recordingId,
          }
        : null,
  };
}

export default async function ResultsPage() {
  const { results, demo } = await getData();
  return <ResultsView r={results} demo={demo} />;
}
