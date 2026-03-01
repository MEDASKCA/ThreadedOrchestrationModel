// lib/greetingEngine.ts
// MEDASKCA greeting engine — British English, NHS-appropriate, 66-pair rotation pool.

export type TimeBucket = "morning" | "midday" | "evening" | "night";
export type PressureLevel = "normal" | "elevated" | "high";
export type OccasionKey =
  | "bank_holiday_week"
  | "winter_pressures"
  | "financial_year_start"
  | "year_end";

export interface GreetingResult {
  line1: string;
  line2: string;
}

interface GreetingEntry {
  id: number;
  line1: string; // contains {name}
  line2: string;
  time?: TimeBucket[];
  pressure?: PressureLevel[];
  section?: string[];
}

// ── GREETING POOL (66 pairs) ──────────────────────────────────────────────────

const POOL: GreetingEntry[] = [

  // ── A. General / Normal pressure / Morning ────────────────────────────────
  { id:  1, line1: "Good morning, {name}.", line2: "Let's get a clear operational view.",            time: ["morning"] },
  { id:  2, line1: "Morning, {name}.",      line2: "Let's set the day up well.",                     time: ["morning"] },
  { id:  3, line1: "Welcome back, {name}.", line2: "Let's prioritise what matters most."                               },
  { id:  4, line1: "Good morning, {name}.", line2: "Let's keep services running smoothly.",           time: ["morning"] },
  { id:  5, line1: "Morning, {name}.",      line2: "Let's get ahead of today's workload.",            time: ["morning"] },
  { id:  6, line1: "Good morning, {name}.", line2: "Let's tighten the operational picture early.",    time: ["morning"] },
  { id:  7, line1: "Morning, {name}.",      line2: "Let's line up the key actions for today.",        time: ["morning"] },
  { id:  8, line1: "Good morning, {name}.", line2: "Let's reduce friction across the system.",        time: ["morning"] },

  // ── A. General / Normal pressure / Midday ─────────────────────────────────
  { id:  9, line1: "Good afternoon, {name}.", line2: "Let's keep momentum strong.",                   time: ["midday"] },
  { id: 10, line1: "Afternoon, {name}.",      line2: "Let's sharpen the operational picture.",        time: ["midday"] },
  { id: 11, line1: "Good afternoon, {name}.", line2: "Let's close the gaps and keep moving.",         time: ["midday"] },
  { id: 12, line1: "Afternoon, {name}.",      line2: "Let's focus on the highest-impact actions.",   time: ["midday"] },
  { id: 13, line1: "Good afternoon, {name}.", line2: "Let's check progress and adjust quickly.",      time: ["midday"] },
  { id: 14, line1: "Afternoon, {name}.",      line2: "Let's keep performance on track.",              time: ["midday"] },
  { id: 15, line1: "Good afternoon, {name}.", line2: "Let's bring clarity to what's outstanding.",   time: ["midday"] },
  { id: 16, line1: "Afternoon, {name}.",      line2: "Let's align the next steps.",                  time: ["midday"] },

  // ── A. General / Normal pressure / Evening ────────────────────────────────
  { id: 17, line1: "Good evening, {name}.", line2: "Let's close with clarity.",                       time: ["evening"] },
  { id: 18, line1: "Evening, {name}.",      line2: "Let's secure the final checks.",                  time: ["evening"] },
  { id: 19, line1: "Good evening, {name}.", line2: "Let's ensure nothing's left exposed.",            time: ["evening"] },
  { id: 20, line1: "Evening, {name}.",      line2: "Let's stabilise the picture before handover.",    time: ["evening"] },
  { id: 21, line1: "Good evening, {name}.", line2: "Let's wrap up the key priorities.",               time: ["evening"] },
  { id: 22, line1: "Evening, {name}.",      line2: "Let's confirm tomorrow's readiness.",             time: ["evening"] },

  // ── A. General / Normal pressure / Night ──────────────────────────────────
  { id: 23, line1: "Hello, {name}.", line2: "Let's keep the essentials stable.",                      time: ["night"] },
  { id: 24, line1: "Hi, {name}.",    line2: "Let's prioritise what needs attention now.",             time: ["night"] },
  { id: 25, line1: "Hello, {name}.", line2: "Let's maintain safe coverage overnight.",                time: ["night"] },

  // ── B. Operations / Access & Pathways ────────────────────────────────────
  { id: 26, line1: "Good morning, {name}.",   line2: "Let's surface the longest waiters first.",      time: ["morning"], section: ["operations"] },
  { id: 27, line1: "Good afternoon, {name}.", line2: "Let's check breach exposure and priorities.",   time: ["midday"],  section: ["operations"] },
  { id: 28, line1: "Welcome back, {name}.",   line2: "Let's validate pathway position and timing.",                      section: ["operations"] },
  { id: 29, line1: "Morning, {name}.",        line2: "Let's tighten RTT visibility across the PTL.", time: ["morning"], section: ["operations"] },
  { id: 30, line1: "Afternoon, {name}.",      line2: "Let's bring clarity to referral progression.", time: ["midday"],  section: ["operations"] },

  // ── B. Operations / Capacity ──────────────────────────────────────────────
  { id: 31, line1: "Good morning, {name}.",   line2: "Let's review live capacity and constraints.",   time: ["morning"], section: ["operations"] },
  { id: 32, line1: "Good afternoon, {name}.", line2: "Let's align beds, theatres and clinics.",       time: ["midday"],  section: ["operations"] },
  { id: 33, line1: "Evening, {name}.",        line2: "Let's stabilise capacity ahead of handover.",   time: ["evening"], section: ["operations"] },
  { id: 34, line1: "Morning, {name}.",        line2: "Let's check the 7-day capacity outlook.",       time: ["morning"], section: ["operations"] },
  { id: 35, line1: "Afternoon, {name}.",      line2: "Let's identify pinch-points early.",            time: ["midday"],  section: ["operations"] },

  // ── B. Operations / Activity & Performance ────────────────────────────────
  { id: 36, line1: "Good morning, {name}.",   line2: "Let's compare activity against plan.",          time: ["morning"], section: ["operations"] },
  { id: 37, line1: "Good afternoon, {name}.", line2: "Let's review variance and drivers.",            time: ["midday"],  section: ["operations"] },
  { id: 38, line1: "Afternoon, {name}.",      line2: "Let's sharpen utilisation and throughput.",     time: ["midday"],  section: ["operations"] },
  { id: 39, line1: "Evening, {name}.",        line2: "Let's lock in today's performance picture.",    time: ["evening"], section: ["operations"] },

  // ── B. Operations / Flow & Escalation ────────────────────────────────────
  { id: 40, line1: "Good morning, {name}.",   line2: "Let's spot bottlenecks before they grow.",      time: ["morning"], section: ["operations"] },
  { id: 41, line1: "Good afternoon, {name}.", line2: "Let's review pressure indicators and flow.",    time: ["midday"],  section: ["operations"] },
  { id: 42, line1: "Evening, {name}.",        line2: "Let's confirm escalation status and risks.",    time: ["evening"], section: ["operations"] },

  // ── B. Logistics / Workforce ──────────────────────────────────────────────
  { id: 43, line1: "Good morning, {name}.",   line2: "Let's secure safe coverage for today.",         time: ["morning"], section: ["logistics"] },
  { id: 44, line1: "Good afternoon, {name}.", line2: "Let's check rota gaps and allocation.",         time: ["midday"],  section: ["logistics"] },
  { id: 45, line1: "Evening, {name}.",        line2: "Let's confirm tomorrow's coverage plan.",       time: ["evening"], section: ["logistics"] },

  // ── B. Logistics / Inventory & Equipment ─────────────────────────────────
  { id: 46, line1: "Good morning, {name}.",   line2: "Let's check stock safety thresholds.",          time: ["morning"], section: ["logistics"] },
  { id: 47, line1: "Good afternoon, {name}.", line2: "Let's confirm equipment availability and risk.", time: ["midday"], section: ["logistics"] },
  { id: 48, line1: "Afternoon, {name}.",      line2: "Let's validate batch and expiry status.",       time: ["midday"],  section: ["logistics"] },

  // ── B. Collaboration ──────────────────────────────────────────────────────
  { id: 49, line1: "Good morning, {name}.",   line2: "Let's bring focus to what's at risk.",          time: ["morning"], section: ["collaboration"] },
  { id: 50, line1: "Good afternoon, {name}.", line2: "Let's clear blockers and keep delivery moving.", time: ["midday"], section: ["collaboration"] },
  { id: 51, line1: "Evening, {name}.",        line2: "Let's close out escalations with clarity.",     time: ["evening"], section: ["collaboration"] },

  // ── B. Intelligence ───────────────────────────────────────────────────────
  { id: 52, line1: "Good morning, {name}.",   line2: "Let's consolidate insight across the system.",  time: ["morning"], section: ["intelligence"] },
  { id: 53, line1: "Good afternoon, {name}.", line2: "Let's generate governance-aligned insight.",    time: ["midday"],  section: ["intelligence"] },
  { id: 54, line1: "Afternoon, {name}.",      line2: "Let's review patterns, trends and exposure.",   time: ["midday"],  section: ["intelligence"] },
  { id: 55, line1: "Evening, {name}.",        line2: "Let's capture a clean audit view.",             time: ["evening"], section: ["intelligence"] },

  // ── B. Configurator ───────────────────────────────────────────────────────
  { id: 56, line1: "Good morning, {name}.",   line2: "Let's keep configuration clean and consistent.", time: ["morning"], section: ["configurator"] },
  { id: 57, line1: "Good afternoon, {name}.", line2: "Let's validate permissions and integrations.",  time: ["midday"],  section: ["configurator"] },
  { id: 58, line1: "Afternoon, {name}.",      line2: "Let's align setup with operational needs.",     time: ["midday"],  section: ["configurator"] },

  // ── C. Elevated pressure ──────────────────────────────────────────────────
  { id: 59, line1: "Good morning, {name}.", line2: "Let's tighten control on today's priorities.",    time: ["morning"], pressure: ["elevated"] },
  { id: 60, line1: "Good afternoon, {name}.", line2: "Let's reduce exposure across key areas.",       time: ["midday"],  pressure: ["elevated"] },
  { id: 61, line1: "Afternoon, {name}.",    line2: "Let's focus on the pressure points first.",       time: ["midday"],  pressure: ["elevated"] },
  { id: 62, line1: "Evening, {name}.",      line2: "Let's stabilise before handover.",                time: ["evening"], pressure: ["elevated"] },

  // ── C. High pressure ──────────────────────────────────────────────────────
  { id: 63, line1: "Good afternoon, {name}.", line2: "Let's get immediate clarity on pressure.",      time: ["midday"],  pressure: ["high"] },
  { id: 64, line1: "Morning, {name}.",       line2: "Let's prioritise the highest-risk areas now.",  time: ["morning"], pressure: ["high"] },
  { id: 65, line1: "Afternoon, {name}.",     line2: "Let's contain constraints and protect flow.",   time: ["midday"],  pressure: ["high"] },
  { id: 66, line1: "Evening, {name}.",       line2: "Let's secure the critical checks for handover.", time: ["evening"], pressure: ["high"] },
];

// ── OCCASION OVERLAYS (replace line2 only) ────────────────────────────────────

const OCCASION_OVERLAYS: Record<OccasionKey, string[]> = {
  bank_holiday_week: [
    "Let's keep coverage tight across the short week.",
    "Let's stay ahead of demand with reduced capacity.",
  ],
  winter_pressures: [
    "Let's stay ahead of winter pressures today.",
    "Let's protect flow and capacity under winter demand.",
  ],
  financial_year_start: [
    "Let's set a strong operational baseline for the new year.",
    "Let's start the year with clean performance visibility.",
  ],
  year_end: [
    "Let's close the year with clarity and control.",
    "Let's keep performance steady through year-end.",
  ],
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

function getTimeBucket(): TimeBucket {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "midday";
  if (h >= 17 && h <= 21) return "evening";
  return "night";
}

function detectOccasion(): OccasionKey | null {
  const now = new Date();
  const m = now.getMonth() + 1; // 1–12
  const d = now.getDate();
  if (m === 4 && d >= 1 && d <= 15) return "financial_year_start";
  if (m === 12 && d >= 15) return "year_end";
  if ([11, 12, 1, 2].includes(m)) return "winter_pressures";
  return null;
}

const LS_KEY = "tom_greeting_used";
const AVOID_MS = 24 * 60 * 60 * 1000;

function getRecentIds(): number[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const entries: { id: number; ts: number }[] = JSON.parse(raw);
    const cutoff = Date.now() - AVOID_MS;
    return entries.filter(e => e.ts > cutoff).map(e => e.id);
  } catch {
    return [];
  }
}

function recordUsed(id: number): void {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const entries: { id: number; ts: number }[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - AVOID_MS;
    const fresh = entries.filter(e => e.ts > cutoff);
    fresh.push({ id, ts: Date.now() });
    localStorage.setItem(LS_KEY, JSON.stringify(fresh));
  } catch {
    // no-op — private browsing or quota exceeded
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────

/**
 * Returns a localised, time-aware, section-aware, rotation-enforced greeting pair.
 * Safe to call from client components only (uses Date + localStorage).
 */
export function getGreeting(
  name: string,
  section?: string,
  pressure: PressureLevel = "normal",
): GreetingResult {
  const bucket = getTimeBucket();
  const occasion = detectOccasion();
  const timeOk = (e: GreetingEntry) => !e.time || e.time.includes(bucket);

  let pool: GreetingEntry[] = [];

  // 1. Pressure-sensitive pool (elevated / high take priority)
  if (pressure === "elevated" || pressure === "high") {
    pool = POOL.filter(e => e.pressure?.includes(pressure) && timeOk(e));
    if (pool.length === 0)
      pool = POOL.filter(e => e.pressure?.includes(pressure)); // any time slot
    if (pool.length === 0)
      pool = POOL.filter(e => e.pressure && timeOk(e)); // any elevated/high
  }

  // 2. Section-specific pool
  const normSection = section && section !== "chat" ? section : "";
  if (pool.length === 0 && normSection) {
    pool = POOL.filter(e => e.section?.includes(normSection) && timeOk(e));
    if (pool.length === 0)
      pool = POOL.filter(e => e.section?.includes(normSection)); // any time slot
  }

  // 3. General fallback — no section, no pressure, matching time
  if (pool.length === 0)
    pool = POOL.filter(e => !e.section && !e.pressure && timeOk(e));

  // 4. Last resort — general, any time
  if (pool.length === 0)
    pool = POOL.filter(e => !e.section && !e.pressure);

  // Apply rotation: prefer entries not used in the last 24 h
  const recentIds = getRecentIds();
  const fresh = pool.filter(e => !recentIds.includes(e.id));
  const chosen = pick(fresh.length > 0 ? fresh : pool);

  recordUsed(chosen.id);

  const line1 = chosen.line1.replace("{name}", name);
  // Allow occasion to override line2
  const line2 =
    occasion && OCCASION_OVERLAYS[occasion]
      ? pick(OCCASION_OVERLAYS[occasion])
      : chosen.line2;

  return { line1, line2 };
}
