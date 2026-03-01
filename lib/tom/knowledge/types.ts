// lib/tom/knowledge/types.ts
// Type definitions for the TOM Knowledge Layer.
// Edit the JSON files in /knowledge/ — never edit these types unless adding a new capability.

export type Intent =
  | "prioritise"
  | "locate"
  | "forecast"
  | "validate"
  | "explain_variance"
  | "risk_escalation"
  | "co_ordinate"
  | "conversational";

export type Domain =
  | "access_pathways"
  | "capacity"
  | "activity_performance"
  | "procedures"
  | "flow_escalation"
  | "workforce"
  | "inventory_equipment"
  | "collaboration"
  | "governance"
  | "intelligence"
  | "general";

export type KnowledgeModule =
  | "operations"
  | "logistics"
  | "collaboration"
  | "intelligence"
  | "configurator";

export interface TriggerMatch {
  /** At least one of these phrases must appear in the prompt */
  must_any: string[];
  /** Each match here adds confidence but is not required */
  should_any?: string[];
  /** If any of these appear, disqualify this trigger entirely */
  must_not?: string[];
}

export interface KnowledgeTrigger {
  id: string;
  /** Which /knowledge/{module}/ folder owns this trigger and its responses */
  module: KnowledgeModule;
  /** Higher = checked first. Use 100 for highest-priority NHS-critical queries */
  priority: number;
  intent: Intent;
  domain: Domain;
  response_key: string;
  match: TriggerMatch;
  processing_state_key?: string;
}

export interface ResponseSection {
  type: "summary" | "table" | "insight" | "actions" | "warning";
  text?: string;
  source?: string;
  columns?: string[];
  items?: string[];
}

export interface ResponseTemplate {
  title: string;
  sections: ResponseSection[];
}

export interface KnowledgeResponse {
  tone: "focused" | "urgent" | "calm" | "informational" | "collaborative";
  /** Cycling processing state messages shown while TOM thinks */
  processing_states: string[];
  response_template: ResponseTemplate;
  /** Which data source keys to query */
  data_sources: string[];
  guardrails: string[];
  follow_up_prompts?: string[];
}

export interface DispatchResult {
  matched: boolean;
  trigger_id: string | null;
  response_key: string | null;
  intent: Intent | null;
  domain: Domain | null;
  /** 0.0–1.0 */
  confidence: number;
  /** Which terms actually fired */
  signals: string[];
  response: KnowledgeResponse | null;
  knowledge_pack_version: string;
}
