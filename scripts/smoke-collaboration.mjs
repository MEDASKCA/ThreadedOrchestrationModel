import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const file = resolve(process.cwd(), "lib", "collaboration.ts");
const text = readFileSync(file, "utf-8");

// Thread list rendering (data presence)
assert(text.includes("export const collaborationThreads"), "collaborationThreads export missing");
assert(/collaborationThreads:\\s*Thread\\[]/.test(text), "collaborationThreads type annotation missing");

// Opening a thread (messages exist)
assert(text.includes("export const seedMessages"), "seedMessages export missing");

// Audit append behavior
assert(text.includes("appendAuditEvent"), "appendAuditEvent missing");

console.log("Collaboration smoke tests passed.");
