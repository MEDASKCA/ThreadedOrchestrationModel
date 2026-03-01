import fs from "node:fs";

const [fixturePath, responsePath] = process.argv.slice(2);

if (!fixturePath || !responsePath) {
  console.error("Usage: node scripts/validate-golden-response.mjs <fixture.json> <response.json>");
  process.exit(1);
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const response = JSON.parse(fs.readFileSync(responsePath, "utf8"));

const routingPath = response?.debug_routing_path ?? response?.trace?.route?.routing_path ?? "";
const actionTypes = Array.isArray(response?.rich?.next_actions)
  ? response.rich.next_actions.map((action) => action?.payload?.type).filter(Boolean)
  : [];

const expectedPaths = Array.isArray(fixture?.expected?.routing_path)
  ? fixture.expected.routing_path
  : [fixture?.expected?.routing_path].filter(Boolean);
const mustHaveActions = Array.isArray(fixture?.expected?.must_have_actions)
  ? fixture.expected.must_have_actions
  : [];

if (expectedPaths.length > 0 && !expectedPaths.includes(routingPath)) {
  console.error(`Routing path mismatch. Expected one of [${expectedPaths.join(", ")}], got "${routingPath}".`);
  process.exit(2);
}

for (const requiredAction of mustHaveActions) {
  if (!actionTypes.includes(requiredAction)) {
    console.error(`Missing required action type "${requiredAction}". Found [${actionTypes.join(", ")}].`);
    process.exit(3);
  }
}

console.log("Golden response validation passed.");
