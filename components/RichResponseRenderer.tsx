"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Info } from "lucide-react";
import type { RichResponse } from "@/lib/tom/rich-response";
import { dedupeSources } from "@/lib/tom/grounding";
import { isAllowedInternalLink } from "@/lib/tom/links";

// chipStyle has no text-size — size is applied inline via `fsXs`
const chipStyle = "inline-flex items-center rounded-full px-3 py-1 font-medium";

// Inline markdown — renders **bold** and *italic* only, no block elements
const inlineMd: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p:      ({ children }) => <>{children}</>,
  strong: ({ children }) => <strong className="font-bold text-[#0c4a6e]">{children}</strong>,
  em:     ({ children }) => <em className="italic">{children}</em>,
};

const badgeStyleFor = (variant?: "good" | "warn" | "bad" | "info") => {
  if (variant === "good") return { background: "#dcfce7", color: "#166534" };
  if (variant === "warn") return { background: "#fef9c3", color: "#854d0e" };
  if (variant === "bad") return { background: "#fee2e2", color: "#991b1b" };
  return { background: "#e0f2fe", color: "#075985" };
};

function hasValue(v: unknown) {
  return v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "--";
}

// Convert snake_case values to Title Case — "at_risk" → "At Risk", "on_track" → "On Track"
function formatLabel(value: string): string {
  if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(value)) return value;
  return value.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Format source identifiers — handles dots AND colons AND snake_case segments
// e.g. "read:operations.access_pathways_waiting_list" → "Operations · Access Pathways Waiting List"
const SOURCE_SKIP = new Set(["view", "read", "write", "api", "db", "get", "list", "fetch"]);
function formatSourceLabel(source: string): string {
  const parts = source.split(/[.:]/).filter(p => p && !SOURCE_SKIP.has(p.toLowerCase()));
  if (parts.length === 0) return source;
  return parts.map(p =>
    p.includes("_")
      ? p.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      : p.charAt(0).toUpperCase() + p.slice(1)
  ).join(" · ");
}

// Detect sections that are internal provenance notes, not user-facing content
const PROVENANCE_HEADINGS = new Set(["What I checked", "Where I looked"]);
function isProvenanceSection(heading: string): boolean {
  return PROVENANCE_HEADINGS.has(heading);
}

// Domain/page label overrides — maps raw snake_case segments to clean display names
// Add entries here whenever a new page is added to the system
const PAGE_LABELS: Record<string, string> = {
  access_pathways_waiting_list: "Waiting List",
  access_pathways:              "Access & Pathways",
  rtt_monitoring:               "RTT Monitoring",
  breach_tracking:              "Breach Tracking",
  referral_management:          "Referral Management",
  triage_status:                "Triage Status",
  clock_starts_stops:           "Clock Starts & Stops",
  pathway_milestones:           "Pathway Milestones",
  validation_quality:           "Validation & Data Quality",
  cancer_pathways:              "Cancer Pathways (2WW)",
  cancer_2ww:                   "Cancer Pathways (2WW)",
  waiting_list:                 "Waiting List",
  waiting:                      "Waiting List",
  operations:                   "Operations",
  logistics:                    "Logistics",
  collaboration:                "Collaboration",
  intelligence:                 "Intelligence",
  configurator:                 "Configurator",
  ptl:                          "PTL",
  staffing:                     "Staffing",
  inventory:                    "Inventory",
  sessions:                     "Sessions",
  theatre:                      "Theatre",
};

const MODULE_LABELS: Record<string, string> = {
  operations:    "Operations",
  logistics:     "Logistics",
  collaboration: "Collaboration",
  intelligence:  "Intelligence",
  configurator:  "Configurator",
};

const MODULE_KEYS = new Set(["operations", "logistics", "collaboration", "intelligence", "configurator"]);

function snakeToLabel(segment: string): string {
  return PAGE_LABELS[segment.toLowerCase().trim()]
    ?? segment.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Replace raw source identifiers in any prose string.
// "operations.ptl" → "Operations: PTL"  |  "operations.access_pathways_waiting_list" → "Operations: Waiting List"
function cleanSourceRefs(text: string): string {
  return text.replace(
    /\b(operations|logistics|collaboration|intelligence|configurator)\.([a-z_]+)\b/g,
    (_match, module, page) => {
      const pageLabel = snakeToLabel(page);
      const moduleLabel = MODULE_LABELS[module] ?? module;
      if (pageLabel.toLowerCase() === moduleLabel.toLowerCase()) return moduleLabel;
      return `${moduleLabel}: ${pageLabel}`;
    },
  );
}

// Transform a single source path segment into a display label, dropping the module prefix
// "operations.ptl" → "PTL"  |  "Operations -> Waiting List Management" → "Waiting List Management"
function pathToLabel(raw: string): string {
  const parts = raw.split(/\s*(?:->|→|\.)\s*/).map(p => p.trim()).filter(Boolean);
  const labels = parts.map(snakeToLabel);
  const meaningful = labels.length > 1 && MODULE_KEYS.has(parts[0].toLowerCase())
    ? labels.slice(1)
    : labels;
  return meaningful.join(": ");
}

// Transform "Checked: operations.ptl and operations.waiting" into
// "PTL and Waiting List" (human format, matching the header colon style)
function formatCheckedBody(body: string): string {
  const match = body.match(/^Checked:\s*(.+)$/i);
  if (!match) return cleanSourceRefs(body);
  const sources = match[1].split(/\s+and\s+/i);
  const labels = sources.map(s => pathToLabel(s.trim()));
  return labels.join(" and ");
}

function CanvasTableHint({ response }: { response: RichResponse }) {
  useEffect(() => {
    const highlights: Array<{ tableTitle?: string; rows: number[] }> = [];
    response.sections.forEach(s => {
      if (s.table?.highlight_rows?.length) {
        highlights.push({ tableTitle: s.title ?? s.heading, rows: s.table.highlight_rows });
      }
    });
    response.tables.forEach(t => {
      if (t.highlight_rows?.length) {
        highlights.push({ tableTitle: t.title, rows: t.highlight_rows });
      }
    });
    if (highlights.length > 0) {
      window.dispatchEvent(new CustomEvent("tom:row_highlights", { detail: { highlights } }));
    }
  }, [response]);

  const totalHighlighted = [
    ...response.sections.filter(s => s.table?.highlight_rows?.length).map(s => s.table!.highlight_rows!.length),
    ...response.tables.filter(t => t.highlight_rows?.length).map(t => t.highlight_rows!.length),
  ].reduce((a, b) => a + b, 0);

  return (
    <div
      className="rounded-xl px-4 py-3 text-[#0369a1]"
      style={{ background: "#e0f2fe", border: "1px solid #bae6fd" }}
    >
      {totalHighlighted > 0
        ? <>
            <strong>{totalHighlighted} relevant row{totalHighlighted !== 1 ? "s" : ""} highlighted</strong> on the page —{" "}
            browse the relevant view from the sidebar to see them.
          </>
        : <>Data is ready — browse the relevant page from the sidebar to view the full breakdown.</>
      }
    </div>
  );
}

export default function RichResponseRenderer({
  response,
  debugRoutingPath,
  traceRoutingPath,
  isCanvasMode,
}: {
  response: RichResponse;
  debugRoutingPath?: string;
  traceRoutingPath?: string;
  isCanvasMode?: boolean;
}) {
  const [showIndicator, setShowIndicator] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showSections, setShowSections] = useState(0);
  const [showNextActions, setShowNextActions] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [confidenceTooltipOpen, setConfidenceTooltipOpen] = useState(false);
  const tooltipAnchorRef = useRef<HTMLSpanElement>(null);

  // Container width for responsive font scaling
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setShowIndicator(false);
    setShowTitle(false);
    setShowSummary(false);
    setShowSections(0);
    setShowNextActions(false);
    setShowConfidence(false);
    setShowChips(false);
    setEvidenceOpen(true);
    setConfidenceTooltipOpen(false);

    const timers: Array<number> = [];
    timers.push(window.setTimeout(() => setShowIndicator(true), 300));
    timers.push(window.setTimeout(() => setShowTitle(true), 900));
    timers.push(window.setTimeout(() => setShowSummary(true), 1020));

    const sectionStart = 1140;
    response.sections.forEach((_, idx) => {
      timers.push(window.setTimeout(() => setShowSections((prev) => Math.max(prev, idx + 1)), sectionStart + idx * 120));
    });

    const actionsDelay = sectionStart + response.sections.length * 120 + 120;
    timers.push(window.setTimeout(() => setShowNextActions(true), actionsDelay));
    timers.push(window.setTimeout(() => setShowConfidence(true), actionsDelay + 120));
    timers.push(window.setTimeout(() => setShowChips(true), actionsDelay + 240));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [response]);

  // Close tooltip on outside click
  useEffect(() => {
    if (!confidenceTooltipOpen) return;
    function handleClick(e: MouseEvent) {
      if (tooltipAnchorRef.current && !tooltipAnchorRef.current.contains(e.target as Node)) {
        setConfidenceTooltipOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [confidenceTooltipOpen]);

  // Responsive font sizes derived from container width.
  // Content div is panel width minus ~48px padding → roughly 232–552px.
  // Map that range to 13–18px base font.
  const base = Math.round(Math.max(13, Math.min(18, 13 + (containerWidth - 232) * (5 / 320))));
  const fsSm  = Math.max(11, base - 2);   // secondary labels, buttons, show/hide
  const fsXs  = Math.max(10, base - 3);   // chips, badges, meta

  const handleRowClick = (link?: string | null) => {
    if (!link || !isAllowedInternalLink(link)) return;
    window.location.assign(link);
  };

  const showConnectedSystemsBanner =
    debugRoutingPath === "connector_fallback" || traceRoutingPath === "connector_fallback";

  return (
    <div
      ref={containerRef}
      className="space-y-4 leading-relaxed text-[#0f172a]"
      style={{ fontSize: base }}
    >
      {showIndicator && showConnectedSystemsBanner && (
        <div className="text-[#94a3b8]">Reviewing connected systems...</div>
      )}

      <div>
        {showTitle && response.title && (
          <div className="font-bold text-[#0f172a] mb-1 transition-opacity duration-300">
            {response.title}
          </div>
        )}
        {showSummary && (
          <p className="text-[#334155] transition-opacity duration-300">
            <ReactMarkdown components={inlineMd}>{cleanSourceRefs(response.summary)}</ReactMarkdown>
          </p>
        )}
      </div>

      {response.sections.length > 0 && (
        <div className="space-y-3">
          {response.sections.map((section, idx) => (
            <div key={idx} style={{ display: idx < showSections ? "block" : "none" }}>
              {section.type === "table" && section.table ? (
                isCanvasMode ? null : (() => {
                  const visibleCols = section.table.columns.filter(col =>
                    section.table!.rows.some(row => hasValue(row[col.key]))
                  );
                  return (
                    <div className="rounded-xl border border-[#e2e8f0] bg-white">
                      {section.title && (
                        <div className="px-4 pt-3 font-semibold text-[#0f172a]">{section.title}</div>
                      )}
                      <div className="overflow-x-auto max-w-full">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="text-left text-[#64748b] bg-[#f8fafc]">
                              {visibleCols.map((col) => (
                                <th
                                  key={col.key}
                                  className="px-4 py-2 font-semibold border-b border-[#e2e8f0] sticky top-0 bg-[#f8fafc]"
                                  style={{ textAlign: col.align || "left", minWidth: col.width ? `${col.width}px` : undefined }}
                                >
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.table.rows.map((row, rowIdx) => {
                              const isHighlighted = section.table?.highlight_rows?.includes(rowIdx) ?? false;
                              return (
                                <tr key={rowIdx} className={isHighlighted ? "bg-[#ccfbf1]" : rowIdx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                                  {visibleCols.map((col) => {
                                    const raw = row[col.key];
                                    const rawStr = hasValue(raw) ? String(raw) : "";
                                    const display = formatLabel(rawStr);
                                    const badgeRule = section.table?.row_badges?.find((rule) => rule.columnKey === col.key);
                                    const badgeVariant = badgeRule?.map[rawStr]?.variant;
                                    return (
                                      <td
                                        key={`${rowIdx}-${col.key}`}
                                        className="px-4 py-2 border-b border-[#e2e8f0] text-[#0f172a] max-w-[320px] truncate"
                                        style={{ textAlign: col.align || "left" }}
                                        title={display}
                                      >
                                        {badgeVariant ? (
                                          <span className="inline-flex rounded-full px-2.5 py-0.5 font-medium" style={{ ...badgeStyleFor(badgeVariant), fontSize: fsXs }}>
                                            {display}
                                          </span>
                                        ) : display}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              ) : section.heading && isProvenanceSection(section.heading) ? (
                <div className="mt-1 text-[#94a3b8] italic">
                  Reviewed: {formatCheckedBody(section.body)}
                </div>
              ) : (
                <>
              {section.heading && (
                <div className="font-semibold text-[#334155] mb-1">
                  {section.heading}
                </div>
              )}
              <div className="mt-0.5 text-[#0f172a]">
                <ReactMarkdown components={inlineMd}>{cleanSourceRefs(section.body)}</ReactMarkdown>
              </div>
              {section.bullets.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-[#475569] space-y-1">
                  {section.bullets.map((bullet, bIdx) => (
                    <li key={bIdx}>
                      <ReactMarkdown components={inlineMd}>{bullet}</ReactMarkdown>
                    </li>
                  ))}
                </ul>
              )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Canvas mode: redirect hint shown instead of tables */}
      {isCanvasMode && response.sections.some(s => s.type === "table" && s.table) && showSections > 0 && (
        <CanvasTableHint response={response} />
      )}

      {!isCanvasMode && response.tables.length > 0 && (
        <div className="space-y-4">
          {response.tables.map((table, idx) => (
            <div key={idx} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
              {table.title && (
                <div className="px-4 pt-3 font-semibold text-[#0f172a]">
                  {table.title}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[#64748b]">
                      {table.columns.map((col, colIdx) => (
                        <th key={colIdx} className="px-4 py-2 font-semibold border-b border-[#e2e8f0]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIdx) => {
                      const isHighlighted = table.highlight_rows?.includes(rowIdx) ?? false;
                      return (
                        <tr
                          key={rowIdx}
                          className={`${isHighlighted ? "bg-[#ccfbf1]" : rowIdx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"} ${isAllowedInternalLink(table.row_links?.[rowIdx]) ? "cursor-pointer hover:bg-[#99f6e4]" : ""}`}
                          onClick={() => handleRowClick(table.row_links?.[rowIdx])}
                        >
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-4 py-2 border-b border-[#e2e8f0] text-[#0f172a]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {response.context_cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {response.context_cards.map((card, idx) => (
            <div key={idx} className="rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden">
              {card.image_url && (
                <img src={card.image_url} alt="" className="h-32 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="font-semibold text-[#0f172a]">{card.title}</div>
                {card.detail && <div className="text-[#64748b] mt-1">{card.detail}</div>}
                {card.meta && <div className="text-[#94a3b8] mt-2" style={{ fontSize: fsSm }}>{card.meta}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {response.next_actions.length > 0 && showNextActions && (
        <div>
          <div className="font-semibold text-[#334155] mb-2">
            Next actions
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {response.next_actions.map((action, idx) => (
              <button
                key={idx}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ background: "#0ea5e9", color: "#ffffff", fontSize: fsSm }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#0284c7"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#0ea5e9"; }}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("tom:action", { detail: action }));
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {response.data_used.length > 0 && showConfidence && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white">
          <button
            type="button"
            className="w-full px-4 pt-3 text-left font-semibold text-[#0f172a] flex items-center justify-between"
            onClick={() => setEvidenceOpen((prev) => !prev)}
          >
            <span className="font-semibold text-[#334155]">Sources & Evidence</span>
            <span className="text-[#64748b]" style={{ fontSize: fsSm }}>{evidenceOpen ? "Hide" : "Show"}</span>
          </button>
          {evidenceOpen && (
            <div className="px-4 pb-4 pt-2 space-y-1.5">
              {response.data_used.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <div className="text-[#64748b]">
                    {item.label ?? formatSourceLabel(item.source)}
                    {item.timeframe ? <span className="ml-1 text-[#94a3b8]" style={{ fontSize: fsSm }}>({item.timeframe})</span> : null}
                  </div>
                  <div className="font-medium text-[#0f172a] whitespace-nowrap">
                    {item.record_counts !== undefined
                      ? `${item.record_counts} record${item.record_counts !== 1 ? "s" : ""}`
                      : typeof item.value === "number"
                      ? `${item.value} record${item.value !== 1 ? "s" : ""}`
                      : item.value !== undefined
                      ? item.value
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showConfidence && response.data_used.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-[#64748b]">
          {response.signal_strength && (
            <span className="flex items-center gap-2">
              <span className="text-[#64748b]" style={{ fontSize: fsSm }}>Signal</span>
              <span className="flex items-center gap-1">
                {[0, 1, 2].map((i) => {
                  const level = response.signal_strength?.level ?? "low";
                  const active = level === "high" ? i <= 2 : level === "medium" ? i <= 1 : i === 0;
                  return (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full"
                      style={{ background: active ? "#0ea5e9" : "#e2e8f0" }}
                    />
                  );
                })}
              </span>
              <span className="text-[#94a3b8]" style={{ fontSize: fsSm }}>{response.signal_strength.rationale}</span>
            </span>
          )}

          {/* Confidence chip with "i" tooltip */}
          <span className="relative" ref={tooltipAnchorRef}>
            <span
              className={chipStyle}
              style={{
                fontSize: fsXs,
                background: response.confidence.level === "high" ? "#dcfce7" : response.confidence.level === "medium" ? "#fef9c3" : "#fee2e2",
                color: response.confidence.level === "high" ? "#166534" : response.confidence.level === "medium" ? "#854d0e" : "#991b1b",
                gap: "6px",
              }}
            >
              Confidence: {response.confidence.level}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setConfidenceTooltipOpen(p => !p); }}
                title="Why this confidence level?"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </span>
            {confidenceTooltipOpen && (
              <div
                className="absolute bottom-full left-0 mb-2 z-20 rounded-xl px-3 py-2.5 leading-snug text-white shadow-lg"
                style={{ background: "#0f172a", fontSize: fsSm, minWidth: 200, maxWidth: 280 }}
              >
                {response.confidence.rationale}
                <span
                  className="absolute top-full left-5"
                  style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #0f172a" }}
                />
              </div>
            )}
          </span>

        </div>
      )}

      {response.data_used.length > 0 && showChips && (
        <div className="flex flex-wrap gap-2">
          {dedupeSources(response.data_used).map((source) => (
            <span
              key={source}
              className={chipStyle}
              style={{ fontSize: fsXs, background: "#f1f5f9", color: "#0f172a" }}
            >
              {formatSourceLabel(source)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
