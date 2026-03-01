# Integration Environment Variables

Set these in `.env.local` to connect real systems. If unset, sandbox connectors are used.
Sandbox endpoint notes: see `docs/integrations-sandboxes.md`.

## Connector selection

TOM_EPR_CONNECTOR=cerner | epic | nervecentre | sandbox
TOM_ROSTER_CONNECTOR=healthroster | allocate | optima | sandbox
TOM_INVENTORY_CONNECTOR=oracle | sandbox
TOM_OPCS_CONNECTOR=opcs4 | sandbox

## Azure SQL (NHS)

AZURE_SQL_SERVER=
AZURE_SQL_DATABASE=
AZURE_SQL_USER=
AZURE_SQL_PASSWORD=
AZURE_SQL_ENCRYPT=true

## Azure SQL queries (optional)

AZURE_SQL_EPR_PATHWAYS_QUERY=
AZURE_SQL_ROSTER_SHIFTS_QUERY=
AZURE_SQL_INVENTORY_STOCK_QUERY=

## EPR

CERNER_FHIR_BASE_URL=
CERNER_FHIR_TOKEN=

EPIC_FHIR_BASE_URL=
EPIC_FHIR_TOKEN=

NERVECENTRE_API_BASE_URL=
NERVECENTRE_API_TOKEN=

## Roster

HEALTHROSTER_API_BASE_URL=
HEALTHROSTER_API_TOKEN=

ALLOCATE_API_BASE_URL=
ALLOCATE_API_TOKEN=

OPTIMA_API_BASE_URL=
OPTIMA_API_TOKEN=

## Inventory

ORACLE_INVENTORY_API_BASE_URL=
ORACLE_INVENTORY_API_TOKEN=

## OPCS

OPCS_JSON_PATH=
