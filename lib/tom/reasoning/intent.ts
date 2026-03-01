import { detectDomain } from "./domain";

export type TomIntent =
  | "smalltalk"
  | "greeting"
  | "typo_oops"
  | "repetition_complaint"
  | "show_in_canvas"
  | "ui_command"
  | "presence_ping"
  | "meta_feedback"
  | "approval_help"
  | "emotion_or_short_utterance"
  | "section_overview"
  | "unknown_domain_query"
  | "conversational_misc"
  | "operational_query"
  | "governance_query"
  | "architecture_query"
  | "unsupported_domain"
  | "staffing"
  | "locate";

const SECTION_KEYWORDS = ["operations", "logistics", "planning", "collaboration", "intelligence", "settings"] as const;
type SectionKeyword = (typeof SECTION_KEYWORDS)[number];

const APPROVAL_HELP_PHRASES = [
  "what do you want me to confirm",
  "what am i confirming",
  "confirm what",
  "what is this approval",
  "what will change",
  "what happens if i approve",
  "why approve",
] as const;

export const isApprovalHelpQuery = (text: string): boolean => {
  const t = text.toLowerCase();
  return APPROVAL_HELP_PHRASES.some((phrase) => t.includes(phrase));
};

export const isExplicitResetQuery = (text: string): boolean =>
  /\b(reset|start over|clear|forget|wipe|new thread)\b/i.test(text);

export const detectSectionOverviewTarget = (text: string): SectionKeyword | null => {
  const t = text.toLowerCase();
  for (const section of SECTION_KEYWORDS) {
    if (t.includes(section)) return section;
  }
  return null;
};

const UNKNOWN_DOMAIN_CANDIDATES = [
  "forums",
  "social",
  "complaints",
  "media",
  "research",
  "finance",
  "hr",
  "payroll",
  "marketing",
  "legal",
] as const;

export const detectUnknownDomainWord = (text: string): string | null => {
  const t = (text || "").toLowerCase();
  for (const word of UNKNOWN_DOMAIN_CANDIDATES) {
    if (t.includes(word)) return word;
  }
  return null;
};

// Classifies whether a locate query is looking for a patient or a staff member.
// Used to decide which views to search (e.g. PTL for patients, roster for staff).
export type LocateEntityType = "patient" | "staff" | "unknown";

export const classifyLocateEntityType = (prompt: string, pageSection?: string): LocateEntityType => {
  const patientSignals = /\b(patient|nhs number|pathway|referral|appointment|procedure|clinic|admitted|inpatient|outpatient|waiting|rtt|surgery|diagnosis|discharge|consultant)\b/i;
  const staffSignals = /\b(nurse|doctor|surgeon|staff member|employee|roster|shift|rota|band|grade|anaesthetist|anaes|scrub|odp|hca|clinician|physio|pharmacist|midwife)\b/i;
  const hasPatient = patientSignals.test(prompt);
  const hasStaff = staffSignals.test(prompt);
  if (hasPatient && !hasStaff) return "patient";
  if (hasStaff && !hasPatient) return "staff";
  // No explicit signals — use current page section as tiebreaker
  if (pageSection === "operations") return "patient";   // operations pages = patient pathways
  if (pageSection === "logistics") return "staff";      // logistics = workforce
  if (pageSection === "planning") return "staff";       // planning = sessions / roster
  // Default: patient (clinical ops staff look up patients most often)
  return "patient";
};

// Extracts the entity name from a locate-intent prompt.
// "tell me about Chioma Eze" → "Chioma Eze"
// "who is Dr Sarah Jones" → "Dr Sarah Jones"
export const extractEntityName = (text: string): string | null => {
  // Capture what follows the lookup verb up to sentence-ending punctuation or a clause boundary
  const m = text.match(
    /(?:tell me about|who is|who's|find out about|find|look up|lookup|search for|what do you know about)\s+([A-Za-z][a-zA-Z.\s'-]{2,50}?)(?:\s*[,?.!;]|\s+(?:she|he|they|is|was|has|have|and|at|in|on|the)\b|$)/i,
  );
  if (!m?.[1]) return null;
  const candidate = m[1].trim();
  // Reject if it starts with a common determiner (means we captured a description, not a name)
  if (/^(the|a|an|this|that|my|our|all|each|every)\b/i.test(candidate)) return null;
  // Must have at least one uppercase letter beyond the very first character to confirm it's a proper noun
  if (!/[A-Z]/.test(candidate.slice(1))) return null;
  return candidate;
};

export const classifyIntent = (text: string): TomIntent => {
  const t = text.toLowerCase();
  const trimmed = t.trim();
  const normalized = trimmed.replace(/[!?.,]+$/g, "").trim();
  const isUiCommand =
    t.includes("open canvas") ||
    t.includes("show canvas") ||
    t.includes("open the canvas") ||
    t.includes("canvas to the right") ||
    t.includes("open panel") ||
    t.includes("show panel") ||
    t.includes("close canvas") ||
    t.includes("open operations") ||
    t.includes("go to operations") ||
    t.includes("switch to operations") ||
    t.includes("back to operations") ||
    normalized === "operations" ||
    t.includes("open planning") ||
    t.includes("go to planning") ||
    t.includes("switch to planning") ||
    t.includes("back to planning") ||
    normalized === "planning" ||
    t.includes("open forum") ||
    t.includes("forum page") ||
    t.includes("go to forum") ||
    t.includes("show forum") ||
    t.includes("open collaboration") ||
    t.includes("go to collaboration") ||
    t.includes("show collaboration") ||
    t.includes("switch to collaboration") ||
    t.includes("back to collaboration") ||
    normalized === "forum" ||
    normalized === "collaboration" ||
    /open\b.*\bcanvas/.test(t) ||
    /launch\b.*\bcanvas/.test(t) ||
    /pull up.*canvas/.test(t);
  const isShowInCanvas =
    t.includes("show it on canvas") ||
    t.includes("open it on canvas") ||
    t.includes("open it in canvas") ||
    t.includes("put it in canvas") ||
    t.includes("on the canvas") ||
    /show\s+.*\s+on\s+canvas/.test(t) ||
    /open\s+.*\s+on\s+canvas/.test(t);
  const isPresencePing =
    normalized === "are you there" ||
    normalized === "you there" ||
    normalized === "ping" ||
    normalized === "test" ||
    normalized === "anyone there" ||
    normalized === "can you hear me";
  const isTypoOops =
    t.includes("oops") ||
    t.includes("sorry") ||
    t.includes("my bad") ||
    t.includes("ignore that") ||
    t.includes("mistake");
  const isGreetingIntent =
    /^(hi|hello|greetings|hey|morning|afternoon)\b/.test(trimmed) ||
    normalized === "hi" ||
    normalized === "hello" ||
    normalized === "hey" ||
    normalized === "greetings" ||
    normalized === "morning" ||
    normalized === "afternoon";
  const isRepetitionComplaint =
    t.includes("why do you keep saying") ||
    t.includes("same thing") ||
    t.includes("repeating") ||
    t.includes("loop") ||
    t.includes("robotic") ||
    t.includes("again");
  const isMetaFeedback =
    t.includes("why do you always") ||
    t.includes("repeat") ||
    t.includes("repetitive") ||
    t.includes("same thing") ||
    t.includes("you keep saying") ||
    t.includes("stuck") ||
    t.includes("loop") ||
    t.includes("do you know about my pages") ||
    t.includes("know my pages") ||
    t.includes("stop saying") ||
    t.includes("annoying") ||
    t.includes("not connected yet") ||
    t.includes("irrelevant") ||
    t.includes("doesn't make sense") ||
    t.includes("not making sense") ||
    t.includes("nonsense") ||
    t.includes("you're not listening") ||
    t.includes("thats wrong") ||
    t.includes("that's wrong") ||
    t.includes("what are you talking about");
  const hasStaffingKeywords = t.includes("staffing") || t.includes("roster") || t.includes("rota") || t.includes("shift") || t.includes("staff");
  const hasOperationalKeywords = t.includes("ptl") || t.includes("patient") || t.includes("waiting") || t.includes("rtt");
  const hasOperationalFallbackKeywords =
    /\b(ptl|roster|inventory|rtt|waiting list|breach|breaches|high waiters|alerts|anomal|referral|staffing|rota|shift)\b/i.test(t);
  const hasFrustrationMarkers =
    t.includes("fuck") ||
    t.includes("shit") ||
    t.includes("damn") ||
    t.includes("annoying") ||
    t.includes("wtf") ||
    t.includes("why do you") ||
    t.includes("seriously");
  const hasExplicitOperationalKeywords =
    /\b(ptl|roster|inventory|rtt|waiting list|breach|breaches|high waiters|alerts|anomal|referral|staffing|rota|shift)\b/i.test(t);
  const isGreeting =
    /^(hi|hello|hey)\b/.test(trimmed) ||
    trimmed === "hi" ||
    trimmed === "hello" ||
    trimmed === "hey" ||
    trimmed.includes("how are you") ||
    trimmed.includes("do you have a name");
  const isCapabilityQuery =
    trimmed.includes("what can you do") ||
    trimmed.includes("what do you do") ||
    trimmed.includes("how can you help") ||
    trimmed === "help" ||
    trimmed.includes("capabilities");
  const isApprovalHelp = isApprovalHelpQuery(t);
  const hasWeatherLike = /\b(weather|forecast|temperature)\b/i.test(t);
  const unknownDomainWord = detectUnknownDomainWord(t);
  const isUnknownDomainQuery =
    Boolean(unknownDomainWord) &&
    detectDomain(t) === "general" &&
    !hasWeatherLike;
  const isConversationalMisc =
    detectDomain(t) === "general" &&
    (
      /\b(what is|how does|why|explain)\b/i.test(t) ||
      /\b(weather|tomorrow|difference|who is|how do i)\b/i.test(t) ||
      trimmed.includes("how do you work") ||
      trimmed.includes("chatgpt") ||
      /\b(ai|llm)\b/i.test(t) ||
      /\b(car|cars|bmw)\b/i.test(t) ||
      !hasExplicitOperationalKeywords
    );
  const sectionTarget = detectSectionOverviewTarget(t);
  const isSectionOverview =
    Boolean(sectionTarget) && (
      t.includes("tell me about") ||
      t.includes("what can you tell me about") ||
      t.includes("what is in") ||
      t.includes("show me") ||
      t.includes("overview")
    );
  // Person/entity lookup — fires when prompt has a lookup verb AND a "FirstName LastName" proper-name pattern
  // e.g. "tell me about Chioma Eze", "who is Dr Smith", "find Alexander Brown"
  const hasLookupVerb = /\b(tell me about|who is|who's|find out about|find|look up|lookup|search for|what do you know about)\b/i.test(t);
  const hasProperName = /\b[A-Z][a-z]{1,}\s+[A-Z][a-z]{1,}\b/.test(text); // original text (not lowercased)
  const isPersonLookup = hasLookupVerb && hasProperName && !isSectionOverview;
  const isShortAmbiguous =
    trimmed.length > 0 &&
    trimmed.length < 20 &&
    !hasOperationalFallbackKeywords &&
    !Boolean(sectionTarget) &&
    !isCapabilityQuery &&
    !isGreeting &&
    !isConversationalMisc;
  const isEmotionOrShortUtterance = hasFrustrationMarkers || isShortAmbiguous;
  if (isUiCommand) {
    return "ui_command";
  }
  if (isShowInCanvas) {
    return "show_in_canvas";
  }
  if (isTypoOops) {
    return "typo_oops";
  }
  if (isGreetingIntent) {
    return "greeting";
  }
  if (isRepetitionComplaint) {
    return "repetition_complaint";
  }
  if (isPresencePing) {
    return "presence_ping";
  }
  if (isMetaFeedback) {
    return "meta_feedback";
  }
  if (isApprovalHelp) {
    return "approval_help";
  }
  if (isSectionOverview) {
    return "section_overview";
  }
  if (isPersonLookup) {
    return "locate";
  }
  if (isUnknownDomainQuery) {
    return "unknown_domain_query";
  }
  if (isConversationalMisc) {
    return "conversational_misc";
  }
  if (isEmotionOrShortUtterance) {
    return "emotion_or_short_utterance";
  }
  if (
    isGreeting || isCapabilityQuery
  ) {
    return "smalltalk";
  }
  if (hasStaffingKeywords && hasOperationalKeywords) {
    return "operational_query";
  }
  if (hasStaffingKeywords) {
    return "staffing";
  }
  if (t.includes("breach") || t.includes("risk") || t.includes("anomal")) {
    return "governance_query";
  }
  if (t.includes("architecture") || t.includes("model") || t.includes("schema")) {
    return "architecture_query";
  }
  if (hasOperationalKeywords) {
    return "operational_query";
  }
  return "unsupported_domain";
};
