import { baselineNaive, baselineSelfAssess } from "./baselines";
import { grounded } from "./grounded";
import type { System } from "./types";

export const SYSTEMS: Record<string, System> = {
  [baselineNaive.name]: baselineNaive,
  [baselineSelfAssess.name]: baselineSelfAssess,
  [grounded.name]: grounded,
};
