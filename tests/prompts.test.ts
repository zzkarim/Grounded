/**
 * Prompt-content guards for the Run 2a specification alignment (DECISIONS.md D20).
 * They check what each system is and isn't told. They don't test model behavior.
 */
import { describe, expect, it } from "vitest";
import { POLICY_CONFIG } from "@/core/policy";
import { NAIVE_SYSTEM_PROMPT, SELF_ASSESS_SYSTEM_PROMPT } from "@/systems/baselines";
import { CLASSIFY_SYSTEM_PROMPT, EXTRACT_SYSTEM_PROMPT, GROUNDED_VERSION } from "@/systems/grounded";
import { FIELD_DEFINITIONS } from "@/systems/shared";
import { SYSTEMS } from "@/systems";

const ALL_PROMPTS = { naive: NAIVE_SYSTEM_PROMPT, selfAssess: SELF_ASSESS_SYSTEM_PROMPT, extract: EXTRACT_SYSTEM_PROMPT, classify: CLASSIFY_SYSTEM_PROMPT };

describe("shared field definitions (all three systems)", () => {
  it.each(Object.entries(ALL_PROMPTS))("%s prompt includes the identical shared definitions", (_, p) => {
    expect(p).toContain(FIELD_DEFINITIONS);
  });

  it("state the representation conventions the benchmark's answers depend on", () => {
    const d = FIELD_DEFINITIONS;
    expect(d).toMatch(/business-hours reading/); // "at 3" → 15:00
    expect(d).toMatch(/current month if it is still in the future, otherwise next month/); // bare ordinal
    expect(d).toMatch(/"Next <weekday>" is ambiguous[^\n]*date null/);
    expect(d).toMatch(/weekday and day of the month contradict[^\n]*date null/);
    expect(d).toMatch(/specific date and no time is still a valid value/);
    expect(d).toMatch(/Timezone is optional/);
    expect(d).toMatch(/agreement or intention to meet/);
    expect(d).toMatch(/specific proposed meeting time that is still pending/);
    expect(d).toMatch(/availability constraints, promises to look for or ask about times/);
    expect(d).toMatch(/the budget is their sum/);
    expect(d).toMatch(/component is not a competing value/);
    expect(d).toMatch(/first name alone is a valid name/);
    expect(d).toMatch(/Final authority is different from leading the evaluation/);
  });

  it("contain no Grounded taxonomy, policy actions or reason codes", () => {
    expect(FIELD_DEFINITIONS).not.toMatch(/\b(EXPLICIT|TENTATIVE|CONDITIONAL|CURRENT|HISTORICAL|NEGATED|SUPERSEDED|DIRECT|INDIRECT|NONE|ACT|ASK|ABSTAIN|NO_OP)\b/);
    expect(FIELD_DEFINITIONS).not.toMatch(/[A-Z]+_[A-Z_]+/); // no reason codes like UNDERSPECIFIED_VALUE
  });
});

describe("self-assessing baseline: fair alignment without Grounded's architecture", () => {
  it("knows the completeness and lesser-stakeholder conventions", () => {
    expect(SELF_ASSESS_SYSTEM_PROMPT).toMatch(/specific date but no time is complete enough for an automatic write/);
    expect(SELF_ASSESS_SYSTEM_PROMPT).toMatch(/missing timezone alone is not a reason for review/);
    expect(SELF_ASSESS_SYSTEM_PROMPT).toMatch(/first name alone is enough/);
    expect(SELF_ASSESS_SYSTEM_PROMPT).toMatch(/lesser role in the decision[^\n]*needs review rather than an automatic write/);
    expect(SELF_ASSESS_SYSTEM_PROMPT).toMatch(/Availability constraints and promises to find or ask about times are not meetings/);
  });
  it("is not given Grounded's labels, policy, reason codes or validation", () => {
    expect(SELF_ASSESS_SYSTEM_PROMPT).not.toMatch(/\b(EXPLICIT|TENTATIVE|CONDITIONAL|HISTORICAL|NEGATED|SUPERSEDED|INDIRECT|DIRECT|sufficiency|certainty|status)\b/);
    expect(SELF_ASSESS_SYSTEM_PROMPT).not.toMatch(/[A-Z]+_[A-Z_]+/);
    expect(SELF_ASSESS_SYSTEM_PROMPT).not.toMatch(/\b(ACT|ASK|ABSTAIN|NO_OP)\b/);
  });
});

describe("naive baseline: definitions only, no safety logic", () => {
  it("has no review/automatic-write guidance", () => {
    expect(NAIVE_SYSTEM_PROMPT).not.toMatch(/AUTO|REVIEW|review|automatic/i);
  });
});

describe("Grounded stays v2.x: semantic labeling only, unchanged policy", () => {
  it("never tells extraction or classification which action to take", () => {
    expect(EXTRACT_SYSTEM_PROMPT).not.toMatch(/\b(ACT|ASK|ABSTAIN|NO_OP)\b/);
    expect(CLASSIFY_SYSTEM_PROMPT).not.toMatch(/\b(ACT|ASK|ABSTAIN|NO_OP)\b/);
  });
  it("is versioned as a v2.x specification alignment with policy default-v2", () => {
    expect(GROUNDED_VERSION).toBe("2.1");
    expect(POLICY_CONFIG).toBe("default-v2");
  });
  it("system versions are bumped for every changed prompt", () => {
    expect(Object.fromEntries(Object.values(SYSTEMS).map((s) => [s.name, s.version]))).toEqual({
      "baseline-naive": "2",
      "baseline-self-assess": "3",
      grounded: "2.1",
    });
  });
});
