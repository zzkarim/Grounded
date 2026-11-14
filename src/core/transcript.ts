/**
 * Deterministic rendering of case inputs into prompt text. Every system uses these renderers,
 * so they all see the same transcript and CRM.
 */
import { CRMState, Transcript } from "./schemas";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayOf(isoDate: string): string {
  return WEEKDAYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()];
}

export function renderTranscript(t: Transcript): string {
  const participants = t.participants
    .map((p) => `- ${p.id}: ${p.name}, ${p.side === "rep" ? "seller (rep)" : "customer"}${p.title ? `, ${p.title}` : ""}`)
    .join("\n");
  const turns = t.turns.map((turn) => `[${turn.id}] ${turn.speakerId}: ${turn.text}`).join("\n");
  return `Call date: ${t.occurredAt} (${weekdayOf(t.occurredAt)})\n\nParticipants:\n${participants}\n\nTranscript (format: [turnId] speakerId: text):\n${turns}`;
}

export function renderCRM(crm: CRMState): string {
  return JSON.stringify(crm, null, 2);
}
