# Integrations (Sandbox + Azure-ready)

This project uses a connector registry to keep TOM deterministic and provenance-first. Each connector has a sandbox adapter and a production adapter that is Azure-ready. See `docs/tom-integrations.md` for the current connector map and `docs/integrations-env.md` for environment variables.

## Connector registry

- `lib/integrations/registry.ts`
- Categories: EPR, Roster, Inventory, OPCS
- Default config: all sandbox

Switch connectors:

`POST /api/integrations/switch`

```json
{ "category": "epr", "id": "cerner" }
```

Check status:

`GET /api/integrations/status`

## Direct connector endpoints

- `GET /api/epr/pathways`
- `GET /api/roster/shifts`
- `GET /api/inventory/stock`
- `GET /api/opcs/search`

## Azure configuration

Set environment variables:

- `AZURE_SQL_SERVER`
- `AZURE_SQL_DATABASE`
- `AZURE_SQL_USER`
- `AZURE_SQL_PASSWORD`
- `AZURE_SQL_ENCRYPT` (default true)

When Azure is not configured, connectors stay in sandbox mode and return deterministic demo data.

## MVP guardrails

- No hallucinated data: every TOM response must come from connectors.
- If connectors are missing or return empty, TOM returns: "No relevant data found from connected systems."
- Responses include sources/status.
