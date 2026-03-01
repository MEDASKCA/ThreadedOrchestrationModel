# TOM Governance Guardrails

TOM is deterministic and provenance-first.

## Rules enforced

1. No hallucinated data
   - If connector data is missing or empty, respond with: "No relevant data found from connected systems."

2. Provenance in every response
   - Responses include connected systems and their status.

3. Threshold-driven alerts
   - Alerts generated only from connector data via `/api/tom/alerts`.

## Thresholds

Config: `lib/tom/thresholds.ts`

- `ptlBreaching`
- `ptlAtRisk`
- `stagnantDays`
- `lowStockCount`

## Integration status

`GET /api/integrations/status` returns connector status, environment, and last sync.

## Alerts API

`GET /api/tom/alerts`

Returns alerts derived from connectors with explicit sources.

## TOM Chat API

`POST /api/tom/chat`

Returns deterministic responses based on connector data only.

## Collaboration commands

Supported commands in Collaboration:
- `@TOM summarize thread`
- `@TOM what is at risk`
- `@TOM check sources`
- `@TOM assign owner <userId>`
- `@TOM resolve`
