import { buildViewEvidence } from "./evidence";

const FIXTURE_ROWS = [
  { theatre: "Theatre 1", session: "AM", specialty: "Orthopaedics", booked: 5, capacity: 6 },
  { theatre: "Theatre 2", session: "PM", specialty: "General Surgery", booked: 4, capacity: 5 },
  { theatre: "Theatre 3", session: "AM", specialty: "ENT", booked: 3, capacity: 4 },
];

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  const rows = FIXTURE_ROWS;
  return {
    data: { rows, source: "fixture" },
    evidence: [buildViewEvidence({ view_id: "logistics.theatre_schedule", filters: params.filters, records: rows, label: "Theatre schedule", value: rows.length, kind: "view_fixture" })],
  };
}
