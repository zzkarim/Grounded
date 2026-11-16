/**
 * Product guardrails (PRODUCT_PLAN.md §26 P0, §29).
 *
 * The product is built around the frozen experiment. These tests fail if:
 *   - any frozen prompt, version, policy, validator, scoring or model default drifts from what was
 *     evaluated on the held-out TEST split (values from data/benchmark/TEST_MANIFEST.md);
 *   - any frozen experimental file differs from the `experiment-v1-complete` tag;
 *   - a historical DECISIONS.md entry was edited (new entries may only be appended);
 *   - product code imports the model SDK directly.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POLICY_CONFIG } from "@/core/policy";
import { SCORING_VERSION } from "@/core/scoring";
import { VALIDATOR_VERSION } from "@/core/validation";
import { DEFAULT_EFFORT, DEFAULT_MODEL, MAX_ATTEMPTS, MAX_TOKENS } from "@/llm/config";
import { baselineNaive, baselineSelfAssess } from "@/systems/baselines";
import { grounded, GROUNDED_VERSION } from "@/systems/grounded";

const FROZEN_TAG = "experiment-v1-complete";
const FROZEN_PATHS = [
  "src/core",
  "src/systems",
  "src/llm",
  "src/eval",
  "data/benchmark",
  "data/runs",
  "data/analysis",
  "LABELING_GUIDE.md",
  "SPEC.md",
];

describe("frozen experiment configuration (as evaluated on TEST)", () => {
  it("Grounded v3 prompt hashes are unchanged", () => {
    expect(GROUNDED_VERSION).toBe("3");
    expect(grounded.promptHashes).toEqual({ extract: "a1184542278c3360", classify: "0565ba90032f9826" });
  });
  it("baseline prompt hashes are unchanged", () => {
    expect(baselineNaive.version).toBe("2");
    expect(baselineNaive.promptHashes).toEqual({ main: "0c85a4c4af3a9e75" });
    expect(baselineSelfAssess.version).toBe("3");
    expect(baselineSelfAssess.promptHashes).toEqual({ main: "10e0f80b92c3d685" });
  });
  it("policy, validator, scoring and model defaults are unchanged", () => {
    expect(POLICY_CONFIG).toBe("default-v3");
    expect(VALIDATOR_VERSION).toBe("meeting-v1");
    expect(SCORING_VERSION).toBe("v2");
    expect(DEFAULT_MODEL).toBe("claude-sonnet-5-5");
    expect(DEFAULT_EFFORT).toBe("medium");
    expect(MAX_TOKENS).toBe(16000);
    expect(MAX_ATTEMPTS).toBe(2);
  });
});

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}
const hasTag = git(["rev-parse", "--verify", "--quiet", `refs/tags/${FROZEN_TAG}`]) !== null;

describe.skipIf(!hasTag)(`frozen files match tag ${FROZEN_TAG}`, () => {
  it("no tracked frozen file differs from the tag (committed or uncommitted)", () => {
    const diff = git(["diff", "--name-only", FROZEN_TAG, "--", ...FROZEN_PATHS]);
    expect(diff).not.toBeNull();
    expect(diff!.trim()).toBe("");
  });
  it("no untracked files were added under frozen paths", () => {
    const untracked = git(["ls-files", "--others", "--exclude-standard", "--", ...FROZEN_PATHS]);
    expect(untracked).not.toBeNull();
    expect(untracked!.trim()).toBe("");
  });
  it("DECISIONS.md is append-only: the tagged text is an unchanged prefix", () => {
    const tagged = git(["show", `${FROZEN_TAG}:DECISIONS.md`]);
    expect(tagged).not.toBeNull();
    expect(fs.readFileSync("DECISIONS.md", "utf8").startsWith(tagged!)).toBe(true);
  });
});

describe("product code boundaries", () => {
  const productDirs = ["src/product", "src/app", "src/components"].filter((d) => fs.existsSync(d));
  const files = productDirs.flatMap((d) =>
    (fs.readdirSync(d, { recursive: true }) as string[]).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => path.join(d, f)),
  );
  it("never imports the model SDK directly (only src/llm may)", () => {
    for (const f of files) expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/@anthropic-ai\/sdk/);
  });
});
