# TOM Integrations & Orchestration

This app is designed to behave like an orchestrator but **never hallucinate**. All data must come from connectors.

## Connector map (MVP)

EPR:
- Cerner Millennium (`cerner`)
- Epic (`epic`)
- Nervecentre (`nervecentre`)
- Sandbox (`sandbox`)

Roster:
- Allocate HealthRoster (`healthroster`)
- Allocate (`allocate`)
- Optima (`optima`)
- Sandbox (`sandbox`)

Inventory:
- Oracle Inventory (`oracle`)
- Sandbox (`sandbox`)

OPCS:
- OPCS-4 (`opcs4`)
- Sandbox (`sandbox`)

## Coverage map

See `docs/connector-coverage.md` for which connector categories power each module.

## How TOM stays deterministic

- Connector registry is the only source of data.
- If connectors are not connected, TOM returns: "No relevant data found from connected systems."
- Alerts are computed from connector data only.

## Alerts

`GET /api/tom/alerts`

- Uses EPR pathways + Inventory stock
- Thresholds configured in `lib/tom/thresholds.ts`

## Switching connectors

`POST /api/integrations/switch`

```json
{ "category": "epr", "id": "cerner" }
```

## Azure SQL

Set env variables in `.env.local`:

```
AZURE_SQL_SERVER=
AZURE_SQL_DATABASE=
AZURE_SQL_USER=
AZURE_SQL_PASSWORD=
AZURE_SQL_ENCRYPT=true
```
