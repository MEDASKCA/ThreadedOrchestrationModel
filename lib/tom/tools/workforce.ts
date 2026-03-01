// lib/tom/tools/workforce.ts
// Person / entity lookup tool.
// In production this queries Staff Finder / ESR / Active Directory / roster user directory.
// Currently returns a "not connected" result since no staff directory connector is wired.

export type PersonMatch = {
  name: string;
  role?: string;
  band?: string;
  ward?: string;
  department?: string;
  site?: string;
  status?: string;
  last_active?: string;
  assignment_today?: string;
};

export type PersonLookupData = {
  match_type: "single" | "multiple" | "none";
  query_name: string;
  matches: PersonMatch[];
  sources_checked: string[];
};

export type PersonLookupResult =
  | { ok: true; data: PersonLookupData }
  | { ok: false; error: string };

export const getPersonLookup = async (input: { name?: string }): Promise<PersonLookupResult> => {
  const name = (input?.name ?? "").trim();
  if (!name) {
    return { ok: false, error: "No name provided" };
  }

  // Connectors checked (in a live system these would each be real lookups)
  const sources_checked = [
    "Staff Finder",
    "Roster / HealthRoster",
    "Collaboration threads",
    "Audit log",
  ];

  // TODO: wire real ESR / Active Directory / Staff Finder query here.
  // Until connectors are live, always return "none" so TOM gives proper Case 3 messaging.
  return {
    ok: true,
    data: {
      match_type: "none",
      query_name: name,
      matches: [],
      sources_checked,
    },
  };
};
