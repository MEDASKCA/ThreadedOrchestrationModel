# TOM Central Interface

## Zero-hallucination guarantees
- All numeric claims must come from tool outputs or deterministic computations.
- The Truth Firewall is the only path from data to response.
- Responses are verified for unknown numbers and unknown patient names.
- If verification fails, TOM returns a deterministic fallback.

## Truth Firewall
- Inputs: user prompt + context bundle.
- Outputs: facts, derived metrics, evidence, permitted actions, missing sources.
- Facts are only sourced from tool outputs or deterministic computations.

## Tool registry
Each tool includes: name, description, input/output schema, permission scope, audit category.

Current stubs:
- EPR/PTL summary + waiters
- PAS referrals (stub)
- COMMS summary (stub)
- Roster staffing summary (stub)
- Alerts
- Anomalies

## Context engine
- Stores active module, filters, recent IDs, last intents, last summary, pending actions.
- Session keyed via `tom_session` cookie.
- PHI minimization: only IDs stored in context.

## Action engine
- Actions are suggested, then require explicit confirmation.
- Execution is logged to `ActionRequest` and audit log.

## Voice mode
- Responses include `voice_summary` for speech.
- For any write action, TOM asks for confirmation before execution.

## Auditability
- Audit log records action type, tools called, and outcomes.
- Evidence panel shows data used per response.

## Limitations
- External connectors are stubbed until real integrations are wired.
- Context storage is in-memory per server instance (no cross-instance persistence).
