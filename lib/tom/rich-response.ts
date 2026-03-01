export type RichDataUsed = {
  source: string;
  kind?: string;
  fetched_at?: string;
  inputs?: Record<string, any>;
  records?: any[];
  timeframe?: string;
  filters?: Record<string, string>;
  record_counts?: number;
  ids?: string[];
  label?: string;
  value?: number | string;
};

export type RichSection = {
  type?: "text" | "table";
  title?: string;
  heading: string;
  body: string;
  bullets: string[];
  table?: {
    columns: Array<{ key: string; label: string; align?: "left" | "right" | "center"; width?: number }>;
    rows: Array<Record<string, string | number | null>>;
    row_badges?: Array<{ columnKey: string; map: Record<string, { variant: "good" | "warn" | "bad" | "info" }> }>;
    highlight_rows?: number[];
  };
  used_fact_ids?: string[];
};

export type RichTable = {
  title?: string;
  columns: string[];
  rows: Array<Array<string>>;
  row_links?: Array<string | null>;
  highlight_rows?: number[];
};

export type RichNextAction = {
  label: string;
  rationale: string;
  action_type: "open" | "filter" | "connect" | "ask" | "highlight";
  payload?: Record<string, any>;
  action_id?: string;
  requires_confirmation?: boolean;
};

export type RichContextCard = {
  title: string;
  detail?: string;
  severity?: "low" | "medium" | "high";
  image_url?: string;
  meta?: string;
};

export type RichResponse = {
  title: string;
  summary: string;
  voice_summary?: string;
  provenance?: { used_fact_ids: string[] };
  sections: RichSection[];
  tables: RichTable[];
  next_actions: RichNextAction[];
  data_used: RichDataUsed[];
  context_cards: RichContextCard[];
  confidence: { level: "low" | "medium" | "high"; rationale: string };
  signal_strength?: { level: "low" | "medium" | "high"; score: number; rationale: string };
};

export const RICH_RESPONSE_SCHEMA = {
  name: "tom_rich_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      voice_summary: { type: "string" },
      provenance: {
        type: "object",
        additionalProperties: false,
        properties: {
          used_fact_ids: { type: "array", items: { type: "string" } },
        },
        required: ["used_fact_ids"],
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            heading: { type: "string" },
            type: { type: "string", enum: ["text", "table"] },
            title: { type: "string" },
            body: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
            table: {
              type: "object",
              additionalProperties: false,
              properties: {
                columns: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      key: { type: "string" },
                      label: { type: "string" },
                      align: { type: "string", enum: ["left", "right", "center"] },
                      width: { type: "number" },
                    },
                    required: ["key", "label"],
                  },
                },
                rows: {
                  type: "array",
                  items: { type: "object", additionalProperties: { type: ["string", "number", "null"] } },
                },
                row_badges: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      columnKey: { type: "string" },
                      map: {
                        type: "object",
                        additionalProperties: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            variant: { type: "string", enum: ["good", "warn", "bad", "info"] },
                          },
                          required: ["variant"],
                        },
                      },
                    },
                    required: ["columnKey", "map"],
                  },
                },
                highlight_rows: { type: "array", items: { type: "number" } },
              },
              required: ["columns", "rows"],
            },
            used_fact_ids: { type: "array", items: { type: "string" } },
          },
          required: ["heading", "body", "bullets"],
        },
      },
      tables: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            columns: { type: "array", items: { type: "string" } },
            rows: { type: "array", items: { type: "array", items: { type: "string" } } },
            row_links: { type: "array", items: { type: ["string", "null"] } },
            highlight_rows: { type: "array", items: { type: "number" } },
          },
          required: ["columns", "rows"],
        },
      },
      next_actions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            rationale: { type: "string" },
            action_type: { type: "string", enum: ["open", "filter", "connect", "ask", "highlight"] },
            payload: { type: "object", additionalProperties: { type: "string" } },
            action_id: { type: "string" },
            requires_confirmation: { type: "boolean" },
          },
          required: ["label", "rationale", "action_type"],
        },
      },
      data_used: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            source: { type: "string" },
            timeframe: { type: "string" },
            filters: { type: "object", additionalProperties: { type: "string" } },
            record_counts: { type: "number" },
            ids: { type: "array", items: { type: "string" } },
            label: { type: "string" },
            value: { type: ["number", "string"] },
          },
          required: ["source"],
        },
      },
      context_cards: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            detail: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            image_url: { type: "string" },
            meta: { type: "string" },
          },
          required: ["title"],
        },
      },
      confidence: {
        type: "object",
        additionalProperties: false,
        properties: {
          level: { type: "string", enum: ["low", "medium", "high"] },
          rationale: { type: "string" },
        },
        required: ["level", "rationale"],
      },
      signal_strength: {
        type: "object",
        additionalProperties: false,
        properties: {
          level: { type: "string", enum: ["low", "medium", "high"] },
          score: { type: "number" },
          rationale: { type: "string" },
        },
        required: ["level", "score", "rationale"],
      },
    },
    required: ["title", "summary", "sections", "tables", "next_actions", "data_used", "context_cards", "confidence", "signal_strength"],
  },
} as const;
