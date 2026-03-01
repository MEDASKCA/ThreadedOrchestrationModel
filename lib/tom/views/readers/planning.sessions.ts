import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildViewEvidence } from "./evidence";

type PlanningSession = {
  id: string;
  date?: string;
  theatreRoomName?: string;
  specialty?: string;
  status?: string;
  cases?: unknown[];
};

export async function read(params: { filters?: Record<string, any> }): Promise<{ data: any; evidence: any[] }> {
  const view_id = "planning.sessions";
  try {
    const snap = await getDocs(query(collection(db, "sessions"), orderBy("date", "asc"), limit(40)));
    const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<PlanningSession, "id">) }));
    return {
      data: { items, source: "firestore" },
      evidence: [buildViewEvidence({ view_id, filters: params.filters, records: items, label: "Planning sessions", value: items.length })],
    };
  } catch {
    return {
      data: { items: [], note: "not_wired", source: "fallback" },
      evidence: [buildViewEvidence({ view_id, filters: params.filters, records: [], label: "Planning sessions", value: 0 })],
    };
  }
}
