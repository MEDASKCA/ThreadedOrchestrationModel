"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, MinusCircle, Ban,
  FlaskConical, ChevronRight, ChevronDown, X, ArrowUpRight, Filter,
  Lock, ArrowLeft, ArrowRight, ArrowLeftRight, Link2,
  Stethoscope, Building2, GitBranch, Zap, Heart, Users, Smartphone,
  BarChart3, Shield, Network,
} from "lucide-react";
import {
  platforms, CATEGORIES, getPlatformStatus, getLifecycleStep, LIFECYCLE_STAGES,
  type Platform, type PlatformModule, type ConnectorState, type Environment, type DataDirection,
} from "@/lib/connectors";

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────

type StatusMeta = {
  color: string;
  bg: string;
  border: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

const STATUS_CONFIG: Record<ConnectorState, StatusMeta> = {
  not_connected: { color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0", label: "Not Connected", Icon: MinusCircle  },
  configuring:   { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "Configuring",   Icon: RefreshCw    },
  sandbox:       { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", label: "Sandbox",       Icon: FlaskConical },
  production:    { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Production",    Icon: CheckCircle2 },
  issues:        { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Issues",        Icon: AlertTriangle },
  degraded:      { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", label: "Degraded",      Icon: AlertCircle  },
  suspended:     { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Suspended",     Icon: Ban          },
};

const ENV_CONFIG: Record<Environment, { color: string; bg: string; label: string }> = {
  production: { color: "#16a34a", bg: "#f0fdf4", label: "PROD"    },
  sandbox:    { color: "#7c3aed", bg: "#f5f3ff", label: "SANDBOX" },
  uat:        { color: "#d97706", bg: "#fffbeb", label: "UAT"     },
};

const DIRECTION_ICON: Record<DataDirection, React.ReactNode> = {
  inbound:       <ArrowLeft      className="w-4 h-4 text-[#0ea5e9]" />,
  outbound:      <ArrowRight     className="w-4 h-4 text-[#7c3aed]" />,
  bidirectional: <ArrowLeftRight className="w-4 h-4 text-[#16a34a]" />,
};

const DIRECTION_LABEL: Record<DataDirection, string> = {
  inbound:       "Inbound",
  outbound:      "Outbound",
  bidirectional: "Bidirectional",
};

const LEVEL_DOT: Record<"info" | "warn" | "error", string> = {
  info:  "#94a3b8",
  warn:  "#d97706",
  error: "#dc2626",
};

// ─── CATEGORY META ─────────────────────────────────────────────────────────────

type CategoryMeta = {
  color: string;
  tint: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  "Primary Care":         { color: "#0ea5e9", tint: "#e0f2fe", Icon: Stethoscope },
  "Acute & Secondary":    { color: "#f97316", tint: "#ffedd5", Icon: Building2   },
  "Referrals & Pathways": { color: "#8b5cf6", tint: "#ede9fe", Icon: GitBranch   },
  "Urgent & Emergency":   { color: "#ef4444", tint: "#fee2e2", Icon: Zap         },
  "Mental Health":        { color: "#14b8a6", tint: "#ccfbf1", Icon: Heart       },
  "Pharmacy":             { color: "#22c55e", tint: "#dcfce7", Icon: FlaskConical },
  "Workforce":            { color: "#0f766e", tint: "#ccfbf1", Icon: Users       },
  "Patient Apps":         { color: "#6366f1", tint: "#e0e7ff", Icon: Smartphone  },
  "Reporting & Incident": { color: "#f59e0b", tint: "#fef3c7", Icon: BarChart3   },
  "Identity & Access":    { color: "#1f2937", tint: "#e5e7eb", Icon: Shield      },
  "Interoperability":     { color: "#0284c7", tint: "#e0f2fe", Icon: Network     },
};

function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? { color: "#64748b", tint: "#f1f5f9", Icon: Building2 };
}

function bucketStatus(status: ConnectorState): ConnectorState {
  if (status === "degraded" || status === "suspended") return "issues";
  return status;
}

type CategoryCounts = { production: number; sandbox: number; configuring: number; issues: number; not_connected: number };

function countCategory(items: Platform[]): CategoryCounts {
  const c = { production: 0, sandbox: 0, configuring: 0, issues: 0, not_connected: 0 };
  items.forEach(p => {
    const s = bucketStatus(getPlatformStatus(p));
    if (s in c) c[s as keyof CategoryCounts] += 1;
  });
  return c;
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status, size = "sm" }: { status: ConnectorState; size?: "sm" | "xs" }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${
        size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <cfg.Icon className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {cfg.label}
    </span>
  );
}

// ─── ENV BADGE ────────────────────────────────────────────────────────────────

function EnvBadge({ env }: { env: Environment }) {
  const cfg = ENV_CONFIG[env];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wide"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ─── CATEGORY CARD (styled like SpecialtyManager) ─────────────────────────────

function CategoryCard({
  category,
  items,
  onClick,
}: {
  category: string;
  items: Platform[];
  onClick: () => void;
}) {
  const meta = getCategoryMeta(category);
  const { Icon } = meta;
  const counts = countCategory(items);
  const connected = items.length - counts.not_connected;

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-[#e2e8f0]"
      onClick={onClick}
    >
      {/* Coloured header area */}
      <div
        className="relative h-44 overflow-hidden flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}bb 100%)` }}
      >
        {/* Large faded icon as texture */}
        <Icon className="w-36 h-36 absolute opacity-[0.12]" style={{ color: "#fff" }} />

        {/* Gradient vignette at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24"
          style={{ background: `linear-gradient(to top, ${meta.color} 0%, transparent 100%)` }}
        />

        {/* Abbreviation badge — top left */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className="px-3 py-1 bg-white/90 text-xs font-bold rounded-full shadow-md uppercase tracking-wide"
            style={{ color: meta.color }}
          >
            {category.split(" ")[0].slice(0, 6)}
          </span>
        </div>

        {/* Category name — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 z-10">
          <h3 className="text-2xl font-bold text-white drop-shadow-lg leading-tight">{category}</h3>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4" style={{ background: meta.color }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-base font-medium">
              {items.length} system{items.length !== 1 ? "s" : ""} · {connected} connected
            </p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {counts.production > 0 && (
                <span className="flex items-center gap-1 text-sm text-white/80">
                  <span className="w-2 h-2 rounded-full inline-block bg-white/90" />
                  {counts.production} live
                </span>
              )}
              {counts.issues > 0 && (
                <span className="flex items-center gap-1 text-sm text-white/80">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#fde68a" }} />
                  {counts.issues} issues
                </span>
              )}
              {counts.configuring > 0 && (
                <span className="flex items-center gap-1 text-sm text-white/80">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#bfdbfe" }} />
                  {counts.configuring} configuring
                </span>
              )}
              {counts.sandbox > 0 && (
                <span className="flex items-center gap-1 text-sm text-white/80">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#ddd6fe" }} />
                  {counts.sandbox} sandbox
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
            <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SUMMARY STRIP ────────────────────────────────────────────────────────────

function SummaryStrip({
  stats,
  activeFilter,
  onFilterChange,
}: {
  stats: { total: number; production: number; sandbox: number; configuring: number; issues: number; not_connected: number };
  activeFilter: ConnectorState | "all";
  onFilterChange: (f: ConnectorState | "all") => void;
}) {
  const items = [
    { key: "all"          as const, label: "Total",         value: stats.total,         color: "#0f172a" },
    { key: "production"   as const, label: "Production",    value: stats.production,    color: "#16a34a" },
    { key: "sandbox"      as const, label: "Sandbox",       value: stats.sandbox,       color: "#7c3aed" },
    { key: "configuring"  as const, label: "Configuring",   value: stats.configuring,   color: "#2563eb" },
    { key: "issues"       as const, label: "Issues",        value: stats.issues,        color: "#d97706" },
    { key: "not_connected"as const, label: "Not Connected", value: stats.not_connected, color: "#94a3b8" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(s => {
        const pct = stats.total > 0 ? Math.round((s.value / stats.total) * 100) : 0;
        const active = activeFilter === s.key;
        return (
          <button
            key={s.label}
            onClick={() => onFilterChange(s.key)}
            className="text-left rounded-xl border px-4 py-3 bg-white transition-all"
            style={{
              borderColor: active ? s.color : "#e2e8f0",
              boxShadow: active ? "0 8px 20px rgba(15,23,42,0.08)" : "0 1px 2px rgba(15,23,42,0.04)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold" style={{ color: s.color }}>{s.label}</div>
              <div className="text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
            </div>
            <div className="h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color, opacity: 0.6 }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── PLATFORM TILE (in drill-down view) ───────────────────────────────────────

function PlatformTile({
  platform,
  selected,
  technicalView,
  onClick,
}: {
  platform: Platform;
  selected: boolean;
  technicalView: boolean;
  onClick: () => void;
}) {
  const status = getPlatformStatus(platform);
  const cfg = STATUS_CONFIG[status];
  const disabled = status === "not_connected" && platform.modules.length === 0;

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      className="group flex flex-col bg-white border rounded-2xl overflow-hidden text-left transition-all duration-150 hover:shadow-lg"
      style={{
        borderColor: selected ? "#0ea5e9" : "#dde3ed",
        boxShadow: selected ? "0 0 0 2px rgba(14,165,233,0.15)" : "0 1px 3px rgba(0,0,0,0.06)",
        opacity: disabled ? 0.52 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
      onMouseEnter={e => { if (!disabled && !selected) (e.currentTarget as HTMLElement).style.borderColor = "#94a3b8"; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "#dde3ed"; }}
    >
      {/* Top row */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-2">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-bold tracking-wide text-white shrink-0"
          style={{ background: platform.color }}
        >
          {platform.initials}
        </div>
        <div className="flex flex-col items-end gap-2">
          <EnvBadge env={platform.environment} />
          <StatusBadge status={status} size="xs" />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-4 flex-1 flex flex-col">
        <div className="text-base font-semibold text-[#0f172a] leading-tight mb-1">{platform.name}</div>
        {(platform.vendor || platform.apiType) && (
          <div className="text-sm text-[#94a3b8] mb-2">
            {[platform.vendor, platform.apiType].filter(Boolean).join(" · ")}
          </div>
        )}
        <p className="text-sm text-[#64748b] leading-relaxed line-clamp-2 flex-1">{platform.description}</p>
        {technicalView && (
          <div className="mt-2 text-xs text-[#94a3b8] font-mono">
            id: {platform.id}
            {platform.lastSync && <span className="ml-3">synced {platform.lastSync}</span>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 border-t border-[#f1f5f9] pt-3 flex items-center justify-between">
        {platform.modules.length > 0 ? (
          <span className="text-sm text-[#64748b]">
            <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: cfg.color }} />
            {platform.modules.length} module{platform.modules.length !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-sm text-[#94a3b8]">
            {platform.lastSync ? `Synced ${platform.lastSync}` : ""}
          </span>
        )}
        {!disabled && (
          <span className="flex items-center gap-0.5 text-sm text-[#0ea5e9] font-medium group-hover:underline">
            {status === "production" ? "Manage" : platform.modules.length > 0 ? "Configure" : "View"}
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </button>
  );
}

// ─── LIFECYCLE BAR ────────────────────────────────────────────────────────────

function LifecycleBar({ status }: { status: ConnectorState }) {
  const step = getLifecycleStep(status);
  const statusColor = STATUS_CONFIG[status].color;

  return (
    <div className="relative pt-1 pb-5">
      {/* Track */}
      <div className="absolute top-[10px] left-3 right-3 h-0.5 bg-[#e2e8f0]" />
      {/* Fill */}
      <div
        className="absolute top-[10px] left-3 h-0.5 transition-all duration-500"
        style={{
          width: step > 0 ? `calc(${(step / 6) * 100}% - ${(step / 6) * 1.5}rem)` : "0",
          background: "#2563eb",
        }}
      />
      {/* Dots */}
      <div className="relative flex justify-between">
        {LIFECYCLE_STAGES.map((label, i) => {
          const completed = i < step;
          const active    = i === step;
          return (
            <div key={label} className="flex flex-col items-center" style={{ width: "14.28%" }}>
              <div className="relative flex items-center justify-center w-5 h-5">
                {active && (
                  <div className="absolute w-4 h-4 rounded-full animate-ping opacity-40" style={{ background: statusColor }} />
                )}
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 relative z-10 transition-all"
                  style={{
                    background:  completed ? "#2563eb" : active ? statusColor : "#e2e8f0",
                    borderColor: completed ? "#2563eb" : active ? statusColor : "#e2e8f0",
                  }}
                />
              </div>
              <div className="mt-1.5 text-xs text-[#94a3b8] text-center leading-tight w-full px-0.5">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MODULE ROW ───────────────────────────────────────────────────────────────

function ModuleRow({
  module,
  expanded,
  technicalView,
  onToggle,
}: {
  module: PlatformModule;
  expanded: boolean;
  technicalView: boolean;
  onToggle: () => void;
}) {
  const cfg = STATUS_CONFIG[module.status];

  return (
    <div className="border border-[#f1f5f9] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fafafa] transition-colors"
        onClick={onToggle}
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.color }} />
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-[#0f172a]">{module.name}</div>
          {technicalView && (
            <div className="text-xs text-[#94a3b8] font-mono">id: {module.id}</div>
          )}
          {module.lastSync && (
            <div className="text-sm text-[#94a3b8]">Synced {module.lastSync}</div>
          )}
        </div>
        {module.errorCount > 0 && (
          <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: "#dc2626" }}>
            {module.errorCount}
          </span>
        )}
        <StatusBadge status={module.status} size="xs" />
        <ChevronDown
          className="w-4 h-4 text-[#94a3b8] shrink-0 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div className="border-t border-[#f1f5f9] px-4 py-4 space-y-5 bg-[#fafafa]">
          <p className="text-sm text-[#64748b]">{module.description}</p>

          {module.dataFlows.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Data Flows</div>
              <div className="space-y-1.5">
                {module.dataFlows.map((flow, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white border border-[#f1f5f9]">
                    <span className="text-sm text-[#475569] flex-1">{flow.domain}</span>
                    {DIRECTION_ICON[flow.direction]}
                    <span className="text-sm text-[#94a3b8] w-24 text-right">{DIRECTION_LABEL[flow.direction]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {technicalView && module.apiEndpoints.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">API Endpoints</div>
              <div className="flex flex-wrap gap-2">
                {module.apiEndpoints.map(ep => (
                  <code key={ep} className="px-2.5 py-1 rounded text-xs bg-[#0f172a] text-[#94a3b8] font-mono">
                    {ep}
                  </code>
                ))}
              </div>
            </div>
          )}

          {technicalView && module.activityLog.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Activity</div>
              <div className="space-y-2">
                {module.activityLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: LEVEL_DOT[entry.level] }} />
                    <div>
                      <div className="text-sm text-[#475569]">{entry.event}</div>
                      <div className="text-xs text-[#94a3b8]">{entry.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────

function DetailPanel({
  platform,
  onClose,
  technicalView,
}: {
  platform: Platform;
  onClose: () => void;
  technicalView: boolean;
}) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeEnv, setActiveEnv] = useState<Environment>(platform.environment);

  const status = getPlatformStatus(platform);
  const cfg = STATUS_CONFIG[status];
  const activeModules = platform.modules.filter(m => m.status !== "not_connected").length;

  function toggleModule(id: string) {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const envMismatch = activeEnv !== platform.environment;

  return (
    <div className="w-[460px] shrink-0 flex flex-col h-full bg-white border-l border-[#dde3ed] overflow-y-auto">

      {/* Sticky header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[#f1f5f9] sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: platform.color }}
          >
            {platform.initials}
          </div>
          <div>
            <div className="text-lg font-semibold text-[#0f172a]">{platform.name}</div>
            <div className="text-sm text-[#94a3b8]">{platform.vendor ?? platform.category}</div>
            {technicalView && (
              <div className="text-xs text-[#94a3b8] font-mono mt-0.5">id: {platform.id}</div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-6">

        {/* Environment selector */}
        <div>
          <div className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Environment</div>
          <div className="flex rounded-xl border border-[#e2e8f0] overflow-hidden">
            {(["sandbox", "uat", "production"] as Environment[]).map(env => {
              const envCfg = ENV_CONFIG[env];
              const isActive = activeEnv === env;
              const isLocked = env === "production" && platform.environment !== "production";
              return (
                <button
                  key={env}
                  onClick={() => setActiveEnv(env)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all"
                  style={{
                    background: isActive ? envCfg.bg : "white",
                    color:      isActive ? envCfg.color : "#94a3b8",
                    borderRight: env !== "production" ? "1px solid #e2e8f0" : undefined,
                  }}
                >
                  {isLocked && <Lock className="w-3.5 h-3.5" />}
                  {envCfg.label}
                </button>
              );
            })}
          </div>
          {envMismatch && (
            <div className="mt-2 px-4 py-3 rounded-lg bg-[#fffbeb] border border-[#fde68a] text-sm text-[#92400e]">
              This environment is not yet configured for this platform.
            </div>
          )}
        </div>

        {/* Platform Health Card */}
        <div>
          <div className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Platform Health</div>
          <div className="px-4 py-4 rounded-xl border" style={{ background: cfg.bg, borderColor: cfg.border }}>
            <div className="flex items-center gap-3">
              <cfg.Icon className="w-6 h-6 shrink-0" style={{ color: cfg.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold" style={{ color: cfg.color }}>{cfg.label}</div>
                {platform.lastSync && (
                  <div className="text-sm text-[#94a3b8]">Last sync: {platform.lastSync}</div>
                )}
              </div>
            </div>
            {platform.modules.length > 0 && (
              <div className="mt-3 pt-3 border-t border-opacity-30" style={{ borderColor: cfg.border }}>
                <div className="text-sm" style={{ color: cfg.color }}>
                  {activeModules} of {platform.modules.length} module{platform.modules.length !== 1 ? "s" : ""} active
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lifecycle Bar */}
        <div>
          <div className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Integration Lifecycle</div>
          <LifecycleBar status={status} />
        </div>

        {/* API Protocol */}
        {platform.apiType && (
          <div>
            <div className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">API Protocol</div>
            <div className="flex items-center gap-2.5 text-base text-[#475569]">
              <Link2 className="w-5 h-5 text-[#0ea5e9] shrink-0" />
              {platform.apiType}
            </div>
          </div>
        )}

        {/* Module Accordion */}
        {platform.modules.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">
              Modules ({platform.modules.length})
            </div>
            <div className="space-y-2">
              {platform.modules.map(mod => (
                <ModuleRow
                  key={mod.id}
                  module={mod}
                  expanded={expandedModules.has(mod.id)}
                  technicalView={technicalView}
                  onToggle={() => toggleModule(mod.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Linked modules */}
        {platform.linkedPlatformModules && platform.linkedPlatformModules.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Linked Platform Modules</div>
            <div className="flex flex-wrap gap-2">
              {platform.linkedPlatformModules.map(mod => (
                <span
                  key={mod}
                  className="px-2.5 py-1 rounded-full text-sm font-medium"
                  style={{ background: "#eff6ff", color: "#0ea5e9", border: "1px solid #bfdbfe" }}
                >
                  {mod}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity (flat production platforms) */}
        {platform.modules.length === 0 && platform.flatStatus === "production" && (
          <div>
            <div className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Recent Activity</div>
            <div className="space-y-2.5">
              {[
                { time: "Just now",  event: "Heartbeat check passed", level: "info"  as const },
                { time: "5 min ago", event: "Auth token refreshed",   level: "info"  as const },
                { time: "1 hr ago",  event: "Full sync completed",    level: "info"  as const },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: LEVEL_DOT[a.level] }} />
                  <div>
                    <div className="text-base text-[#475569]">{a.event}</div>
                    <div className="text-sm text-[#94a3b8]">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-medium text-white transition-colors"
          style={{ background: status === "production" ? "#0ea5e9" : "#0f172a" }}
        >
          <ArrowUpRight className="w-5 h-5" />
          {status === "production" || status === "sandbox" ? "Open Integration Settings" : "Begin Configuration"}
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ConnectorsSection() {
  const [search, setSearch]                     = useState("");
  const [selected, setSelected]                 = useState<Platform | null>(null);
  const [statusFilter, setStatusFilter]         = useState<ConnectorState | "all">("all");
  const [technicalView, setTechnicalView]       = useState(false);
  const [activeCategory, setActiveCategory]     = useState<string | null>(null);

  // Filtered list used in platform drill-down
  const filteredPlatforms = useMemo(() => {
    const q = search.toLowerCase();
    return platforms.filter(p => {
      const matchSearch = !q
        || p.name.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q)
        || p.category.toLowerCase().includes(q)
        || (p.vendor ?? "").toLowerCase().includes(q);
      const status = bucketStatus(getPlatformStatus(p));
      const matchStatus = statusFilter === "all" ? true : status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  // Platform stats over the full list
  const stats = useMemo(() => {
    const base = { total: platforms.length, production: 0, sandbox: 0, configuring: 0, issues: 0, not_connected: 0 };
    platforms.forEach(p => {
      const s = bucketStatus(getPlatformStatus(p));
      if (s === "production")   base.production   += 1;
      else if (s === "sandbox") base.sandbox       += 1;
      else if (s === "configuring") base.configuring += 1;
      else if (s === "issues")  base.issues        += 1;
      else                      base.not_connected += 1;
    });
    return base;
  }, []);

  // Category groups for the category grid
  const categoryGroups = useMemo(() => {
    const categories = CATEGORIES.filter(c => c !== "All");
    return categories.map(category => ({
      category,
      items: platforms.filter(p => p.category === category),
    })).filter(g => g.items.length > 0);
  }, []);

  // Platforms in the active category (for drill-down)
  const categoryPlatforms = useMemo(() => {
    if (!activeCategory) return [];
    return filteredPlatforms.filter(p => p.category === activeCategory);
  }, [activeCategory, filteredPlatforms]);

  // Deselect platform if it drops out of filter
  useEffect(() => {
    if (selected && !filteredPlatforms.some(p => p.id === selected.id)) setSelected(null);
  }, [filteredPlatforms, selected]);

  const activeMeta = activeCategory ? getCategoryMeta(activeCategory) : null;

  // ── PLATFORM DRILL-DOWN VIEW ──────────────────────────────────────────────
  if (activeCategory) {
    return (
      <div className="flex h-full overflow-hidden" style={{ background: "#f4f6f9" }}>

        {/* Left: platform grid */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Header */}
          <div className="px-7 pt-6 pb-4 shrink-0">
            {/* Back row */}
            <button
              onClick={() => { setActiveCategory(null); setSelected(null); }}
              className="flex items-center gap-2 text-base font-medium text-[#64748b] hover:text-[#0ea5e9] transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              All Categories
            </button>

            {/* Category title */}
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: activeMeta?.tint }}
                >
                  {activeMeta && <activeMeta.Icon className="w-6 h-6" style={{ color: activeMeta.color }} />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#0f172a]">{activeCategory}</h1>
                  <p className="text-base text-[#94a3b8]">
                    {categoryGroups.find(g => g.category === activeCategory)?.items.length ?? 0} systems in this category
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTechnicalView(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium bg-white"
                  style={{ borderColor: technicalView ? "#0ea5e9" : "#dde3ed", color: technicalView ? "#0ea5e9" : "#64748b" }}
                >
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: technicalView ? "#0ea5e9" : "#cbd5e1" }} />
                  Technical View
                </button>
                <div className="flex items-center gap-2 bg-white border border-[#dde3ed] rounded-xl px-4 py-2">
                  <Filter className="w-4 h-4 text-[#94a3b8]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter systems..."
                    className="text-base outline-none bg-transparent text-[#0f172a] placeholder:text-[#94a3b8] w-36"
                  />
                </div>
              </div>
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { key: "all"          as const, label: "All",           count: categoryGroups.find(g => g.category === activeCategory)?.items.length ?? 0 },
                { key: "production"   as const, label: "Production",    count: countCategory(categoryGroups.find(g => g.category === activeCategory)?.items ?? []).production },
                { key: "issues"       as const, label: "Issues",        count: countCategory(categoryGroups.find(g => g.category === activeCategory)?.items ?? []).issues },
                { key: "configuring"  as const, label: "Configuring",   count: countCategory(categoryGroups.find(g => g.category === activeCategory)?.items ?? []).configuring },
                { key: "sandbox"      as const, label: "Sandbox",       count: countCategory(categoryGroups.find(g => g.category === activeCategory)?.items ?? []).sandbox },
                { key: "not_connected"as const, label: "Not Connected", count: countCategory(categoryGroups.find(g => g.category === activeCategory)?.items ?? []).not_connected },
              ]).filter(f => f.key === "all" || f.count > 0).map(f => {
                const active = statusFilter === f.key;
                const color = f.key === "all" ? "#0f172a" : STATUS_CONFIG[f.key]?.color ?? "#94a3b8";
                return (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                    style={{
                      background: active ? color : "white",
                      color:      active ? "white" : color,
                      borderColor: active ? color : "#e2e8f0",
                    }}
                  >
                    {f.label} · {f.count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform grid */}
          <div className="flex-1 overflow-y-auto px-7 pb-7">
            {categoryPlatforms.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-base text-[#94a3b8]">No platforms match your filters.</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${selected ? "grid-cols-2" : "grid-cols-3"}`}>
                {categoryPlatforms.map(platform => (
                  <PlatformTile
                    key={platform.id}
                    platform={platform}
                    selected={selected?.id === platform.id}
                    technicalView={technicalView}
                    onClick={() => setSelected(prev => prev?.id === platform.id ? null : platform)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <DetailPanel
            platform={selected}
            technicalView={technicalView}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    );
  }

  // ── CATEGORY GRID VIEW ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#f4f6f9" }}>

      {/* Header */}
      <div className="px-7 pt-6 pb-4 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a] leading-tight">NHS Ecosystem Marketplace</h1>
            <p className="text-base text-[#94a3b8] mt-1">
              Integrations, data pipelines, and system connections for this TOM deployment.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setTechnicalView(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium bg-white"
              style={{ borderColor: technicalView ? "#0ea5e9" : "#dde3ed", color: technicalView ? "#0ea5e9" : "#64748b" }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: technicalView ? "#0ea5e9" : "#cbd5e1" }} />
              Technical View
            </button>
          </div>
        </div>

        <SummaryStrip stats={stats} activeFilter={statusFilter} onFilterChange={setStatusFilter} />
        <details className="mt-4 bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-[#0f172a]">
            NOTE FOR LATER (TOM guardrails + integration readiness)
          </summary>
          <div className="px-4 pb-4 pt-1 text-xs text-[#475569] space-y-3">
            <div className="text-[11px] text-[#94a3b8] uppercase tracking-widest font-semibold">Guardrails</div>
            <div className="space-y-1">
              <div><span className="font-semibold">Non‑negotiable:</span> TOM must only show/compute information from connected systems. No inference/hallucination.</div>
              <div><span className="font-semibold">1) Provenance:</span> Every tile/metric shows Sources Used + Last Updated + freshness indicator.</div>
              <div><span className="font-semibold">2) Missing data:</span> If connectors return no relevant data, show “No relevant data found from connected systems” and list missing sources.</div>
              <div><span className="font-semibold">3) Minimum‑source gating:</span> Each view declares required sources. If any required source is unavailable or stale, do not compute derived outputs.</div>
              <div><span className="font-semibold">4) Conflict handling:</span> If sources disagree, show conflict state or apply explicit precedence rules — never fabricate.</div>
              <div><span className="font-semibold">5) Auditability:</span> Keep an internal trace of connector queries and responses used to produce the view.</div>
            </div>

            <div className="text-[11px] text-[#94a3b8] uppercase tracking-widest font-semibold mt-4">Minimum Required Sources (Examples)</div>
            <div className="space-y-1">
              <div><span className="font-semibold">Staffing vs Planned Sessions:</span> roster + session plan. If either missing → do not compute.</div>
            </div>

            <div className="text-[11px] text-[#94a3b8] uppercase tracking-widest font-semibold mt-4">Integration Readiness</div>
            <div className="space-y-1">
              <div>Design TOM around vendor‑agnostic entities (Patient/Pathway, Session, Bed/Capacity, Procedure, Workforce, Equipment/Assets, Inventory/Stock, Incidents).</div>
              <div>Use adapters/mappers per connector (FHIR/HL7/API/DB extract) to normalize into those entities.</div>
              <div>UI remains stable across sites; only mappings change per pilot/trust.</div>
            </div>
          </div>
        </details>
      </div>

      {/* Category grid */}
      <div className="flex-1 overflow-y-auto px-7 pb-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {categoryGroups.map(({ category, items }) => (
            <CategoryCard
              key={category}
              category={category}
              items={items}
              onClick={() => { setActiveCategory(category); setStatusFilter("all"); setSearch(""); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
