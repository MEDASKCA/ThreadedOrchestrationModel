# TOM Anomalies v1 (Feature Flag: `tom_anomalies_v1`)

Purpose: provide transparent, auditable anomaly detection for Access & Pathways without automation.

## Guardrails
- No inference without data. Only computed from connected systems.
- Every anomaly stores a full transparency payload (baseline, current, deviation, volume, confidence).
- Alerts are deduplicated and updated, never overwritten.
- Outputs are queryable via API and suitable for future cross-module integration.

## Endpoints (v1)
- `POST /api/tom/metrics/run` — collects metrics into the warehouse.
- `POST /api/tom/baselines/run` — computes rolling baselines from stored metrics.
- `POST /api/tom/anomalies/run` — detects anomalies + logs alert dispatches.
- `GET /api/tom/anomalies` — list anomalies (filter: scope, scope_id, severity, status).
- `GET /api/tom/anomalies/history?anomaly_id=...` — anomaly history.

## Channels (stub)
- In-app: stored as `AlertDispatch` with channel = `in_app`.
- Email/Teams: stored as stub payloads (no real sending).

## Transparency payload fields (stored)
```
metric
scope
baseline_window
current_window
baseline_value
current_value
percentage_change
standard_deviation_delta
volume_context
severity
confidence
projected_impact
explanation
```

## SQLite + Prisma
Set `DATABASE_URL="file:./tom.db"` in `.env.local`.
Run `npx prisma generate` and `npx prisma db push` to initialize the schema.
