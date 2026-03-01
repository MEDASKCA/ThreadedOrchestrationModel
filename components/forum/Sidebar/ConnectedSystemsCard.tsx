type ConnectedSystemsCardProps = {
  systems: string[];
};

export default function ConnectedSystemsCard({ systems }: ConnectedSystemsCardProps) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#ffffff",
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
        Connected systems
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {systems.length === 0 && (
          <div className="text-xs text-slate-500">No systems connected yet.</div>
        )}
        {systems.map((system) => (
          <div key={system} className="flex items-center justify-between">
            <span>{system}</span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#22c55e",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-slate-500">Synced just now</div>
    </div>
  );
}
