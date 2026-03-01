"use client";

import { useRef } from "react";
import type { RichSection } from "@/lib/tom/rich-response";

type CanvasPanelProps = {
  open: boolean;
  title: string;
  markdown: string;
  blocks?: RichSection[];
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose: () => void;
};

// ---------- Status badge colour mapping ----------
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  breaching:   { bg: "#fef2f2", text: "#b91c1c", dot: "#dc2626" },
  "at_risk":   { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  "at risk":   { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  on_track:    { bg: "#f0fdf4", text: "#166534", dot: "#16a34a" },
  "on track":  { bg: "#f0fdf4", text: "#166534", dot: "#16a34a" },
  urgent:      { bg: "#fef2f2", text: "#b91c1c", dot: "#dc2626" },
  expedited:   { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  routine:     { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  blocked:     { bg: "#fef2f2", text: "#b91c1c", dot: "#dc2626" },
  escalated:   { bg: "#fff7ed", text: "#9a3412", dot: "#ea580c" },
  resolved:    { bg: "#f0fdf4", text: "#166534", dot: "#16a34a" },
  active:      { bg: "#f0fdf4", text: "#166534", dot: "#16a34a" },
  "in_progress": { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  "in progress": { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  open:        { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  closed:      { bg: "#f8fafc", text: "#475569", dot: "#94a3b8" },
  pending:     { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  cancelled:   { bg: "#f8fafc", text: "#475569", dot: "#94a3b8" },
  low:         { bg: "#f0fdf4", text: "#166534", dot: "#16a34a" },
  medium:      { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  high:        { bg: "#fef2f2", text: "#b91c1c", dot: "#dc2626" },
};

function statusStyle(value: string) {
  const key = value.trim().toLowerCase();
  return STATUS_COLORS[key] ?? null;
}

// ---------- Cell renderer ----------
function CellValue({ value, colKey }: { value: string; colKey: string }) {
  const isStatusCol = /status|priority|rtt|breach|risk|state|condition/i.test(colKey);
  if (!isStatusCol) {
    return <span className="text-slate-800">{value}</span>;
  }
  const style = statusStyle(value);
  if (!style) return <span className="text-slate-800">{value}</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium"
      style={{ background: style.bg, color: style.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.dot }} />
      {value}
    </span>
  );
}

// ---------- Snapshot table ----------
function SnapshotTable({ section }: { section: RichSection }) {
  const table = section.table!;
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {section.title && (
        <div className="px-4 py-2.5 border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
          <span className="text-[12px] font-semibold tracking-widest uppercase text-[#64748b]">
            {section.title}
          </span>
        </div>
      )}
      {!section.title && section.heading && (
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
          <span className="text-[12px] font-semibold uppercase tracking-widest text-slate-500">
            {section.heading}
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {table.columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap border-b border-[#e2e8f0]"
                  style={{ color: "#64748b" }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-slate-100 transition-colors hover:bg-blue-50/40"
                style={{ background: rowIdx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
              >
                {table.columns.map((col) => {
                  const raw = row[col.key];
                  const value = raw === null || raw === undefined ? "—" : String(raw);
                  return (
                    <td key={`${rowIdx}-${col.key}`} className="px-4 py-2.5">
                      <CellValue value={value} colKey={col.key} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {table.rows.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-slate-400">No records</div>
        )}
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {table.rows.length} row{table.rows.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[11px] text-slate-300">TOM • {new Date().toLocaleDateString("en-GB")}</span>
      </div>
    </div>
  );
}

// ---------- Markdown narrative parser ----------
const parseMarkdown = (markdown: string) => {
  const lines = markdown.split("\n");
  const items: Array<{ kind: "heading" | "check" | "bullet" | "text"; value: string; checked?: boolean }> = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      items.push({ kind: "heading", value: trimmed.replace(/^#{2,3}\s/, "") });
    } else if (trimmed.startsWith("- [ ] ")) {
      items.push({ kind: "check", value: trimmed.slice(6), checked: false });
    } else if (trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
      items.push({ kind: "check", value: trimmed.slice(6), checked: true });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      items.push({ kind: "bullet", value: trimmed.replace(/^[-•]\s/, "") });
    } else {
      items.push({ kind: "text", value: trimmed });
    }
  }
  return items;
};

// ---------- Main component ----------
export default function CanvasPanel({
  open,
  title,
  markdown,
  blocks,
  fullscreen = false,
  onToggleFullscreen,
  onClose,
}: CanvasPanelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const items = parseMarkdown(markdown);
  const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
  const tableBlocks = hasBlocks ? blocks!.filter(b => b.type === "table" && b.table) : [];
  const textBlocks = hasBlocks ? blocks!.filter(b => b.type !== "table" || !b.table) : [];
  const hasNarrative = markdown.trim().length > 0;
  const isSnapshot = hasBlocks && tableBlocks.length > 0;
  const now = new Date();
  const timestamp = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${title || "TOM Snapshot"}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #0f172a; padding: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #1e3a5f; color: #93c5fd; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) td { background: #f8fafc; }
            .header { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1e3a5f; }
            .narrative { background: #f0f9ff; border-left: 3px solid #0ea5e9; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; line-height: 1.6; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <strong style="font-size:16px">${title || "TOM Snapshot"}</strong>
            <div style="font-size:11px;color:#64748b;margin-top:4px">${timestamp} · Threaded Orchestration Model</div>
          </div>
          ${content}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <aside className={`h-full w-full shrink-0 bg-white ${fullscreen ? "" : "border-l border-slate-200"}`}>
      <div className="h-full flex flex-col">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
          {/* Top bar */}
          <div className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {isSnapshot && (
                <span
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: "#e0f2fe", color: "#0369a1" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Snapshot
                </span>
              )}
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-slate-900 truncate">{title || "Canvas"}</div>
                {isSnapshot && (
                  <div className="text-[11px] text-slate-400 mt-0.5">{timestamp}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isSnapshot && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Export
                </button>
              )}
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-md border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50"
                onClick={() => navigator.clipboard?.writeText(markdown).catch(() => undefined)}
              >
                Copy
              </button>
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-md border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50"
                onClick={onToggleFullscreen}
              >
                {fullscreen ? "Exit" : "Expand"}
              </button>
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-md border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50"
                onClick={onClose}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div ref={printRef} className="px-5 py-5 overflow-y-auto flex-1 min-h-0 space-y-5">

          {/* Narrative / summary block */}
          {hasNarrative && (
            <div
              className="rounded-xl px-4 py-3.5 text-[14px] leading-relaxed text-slate-700"
              style={{
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                borderLeft: "3px solid #0ea5e9",
              }}
            >
              {items.map((item, idx) => {
                if (item.kind === "heading") {
                  return (
                    <div key={idx} className="text-[13px] font-semibold text-slate-600 uppercase tracking-wide mb-2 mt-3 first:mt-0">
                      {item.value}
                    </div>
                  );
                }
                if (item.kind === "check") {
                  return (
                    <label key={idx} className="flex items-start gap-2 mb-1">
                      <input type="checkbox" defaultChecked={item.checked} className="mt-0.5 shrink-0" />
                      <span>{item.value}</span>
                    </label>
                  );
                }
                if (item.kind === "bullet") {
                  return (
                    <div key={idx} className="flex items-start gap-2 mb-1">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span>{item.value}</span>
                    </div>
                  );
                }
                return (
                  <p key={idx} className="mb-1 last:mb-0">{item.value}</p>
                );
              })}
            </div>
          )}

          {/* Table blocks — the visual "screenshot" */}
          {tableBlocks.map((section, idx) => (
            <SnapshotTable key={idx} section={section} />
          ))}

          {/* Text/bullet blocks */}
          {textBlocks.map((section, idx) => (
            <div key={idx} className="space-y-2">
              {section.heading && (
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {section.heading}
                </div>
              )}
              {section.body && (
                <div className="text-[14px] text-slate-700 leading-relaxed">{section.body}</div>
              )}
              {section.bullets?.length ? (
                <ul className="space-y-1">
                  {section.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2 text-[13px] text-slate-600">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          {/* Fallback: plain markdown when no blocks at all */}
          {!hasBlocks && !hasNarrative && (
            <div className="text-[14px] text-slate-400 text-center py-12">Canvas is empty</div>
          )}

          {/* Snapshot footer */}
          {isSnapshot && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Threaded Orchestration Model · MedAskCA</span>
              <span className="text-[11px] text-slate-300">{timestamp}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
