# Access & Pathways API (Scaffolding)

Base prefix: `/api/access-pathways`

## Endpoints

- `GET /ptl`
  - Returns PTL pathways + metric counts
  - Query params: `specialty`, `consultant`, `site`, `date_from`, `date_to`, `search`, `rtt_status`, `stage`, `priority`, `owner_id`, `metric`

- `GET /ptl/metrics`
  - Returns PTL metric counts + definitions + thresholds
  - Query params: `specialty`, `consultant`, `site`, `date_from`, `date_to`, `search`

- `GET /waiting-list`
- `GET /rtt-monitoring`
- `GET /cancer-pathways`
- `GET /referral-management`
- `GET /triage-status`
- `GET /breach-tracking`
- `GET /pathway-milestones`
- `GET /clock-starts-stops`
- `GET /validation-quality`

Each non-PTL endpoint returns metric definitions with counts computed from the shared pathway fixture data.

## Filters

All endpoints accept:
- `specialty`
- `consultant`
- `site`
- `date_from`
- `date_to`

Responses include `filter_options` with available values.

## Common response shape

```json
{
  "metrics": [{ "key": "metric_key", "count": 0 }],
  "definitions": [{ "key": "metric_key", "label": "Label", "category": "risk", "definition": "..." }],
  "table": { "columns": [{ "key": "specialty", "label": "Specialty" }], "rows": [{ "specialty": "Orthopaedics" }] },
  "sources": { "sources_used": [{ "system": "demo-fixture", "status": "mock" }], "expected_sources": ["PAS/EPR"] },
  "filter_options": { "specialties": ["Orthopaedics"], "consultants": ["Dr Patel"], "sites": ["Royal Infirmary"] },
  "context": { "specialty": "...", "consultant": "..." },
  "updated_at": "2026-02-21T01:00:00.000Z"
}
```

## PTL response shape

```json
{
  "data": [/* Pathway records */],
  "counts": [{ "key": "in_pool", "count": 12 }],
  "context": { "specialty": "Orthopaedics" },
  "updated_at": "2026-02-21T01:00:00.000Z"
}
```
