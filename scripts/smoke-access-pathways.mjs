import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const computeFile = resolve(process.cwd(), "lib", "pathways", "compute.ts");
const text = readFileSync(computeFile, "utf-8");

const requiredFns = [
  "computeWaitingListMetrics",
  "computeRttMetrics",
  "computeCancerMetrics",
  "computeReferralMetrics",
  "computeTriageMetrics",
  "computeBreachMetrics",
  "computeMilestoneMetrics",
  "computeClockMetrics",
  "computeValidationMetrics",
];

requiredFns.forEach((fn) => {
  assert(text.includes(`export const ${fn}`), `${fn} export missing`);
});

console.log("Access & Pathways smoke tests passed.");
