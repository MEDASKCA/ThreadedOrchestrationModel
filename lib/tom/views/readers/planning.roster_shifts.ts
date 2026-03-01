import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildViewEvidence } from "./evidence";

type PlanningRosterShift = {
  id: string;
  staffName?: string;
  role?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  assigned?: boolean;
};

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  const view_id = "planning.roster_shifts";
  try {
    const snap = await getDocs(query(collection(db, "rosterShifts"), orderBy("date", "desc"), limit(60)));
    const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<PlanningRosterShift, "id">) }));
    return {
      data: { items, source: "firestore" },
      evidence: [buildViewEvidence({ view_id, filters: params.filters, records: items, label: "Planning roster shifts", value: items.length })],
    };
  } catch {
    return {
      data: { items: [], note: "not_wired", source: "fallback" },
      evidence: [buildViewEvidence({ view_id, filters: params.filters, records: [], label: "Planning roster shifts", value: 0 })],
    };
  }
}
