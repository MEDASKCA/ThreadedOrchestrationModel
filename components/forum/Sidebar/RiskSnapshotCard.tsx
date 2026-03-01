type RiskSnapshot = {
  rttClock: string;
  riskLevel: string;
  daysToBreach: string;
  schedulingGap: string;
  openTasks: string;
};

type RiskSnapshotCardProps = {
  data: RiskSnapshot;
};

export default function RiskSnapshotCard({ data }: RiskSnapshotCardProps) {
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
        Risk snapshot
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span>RTT Clock</span>
          <span style={{ fontWeight: 600 }}>{data.rttClock}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Risk level</span>
          <span
            style={{
              borderRadius: 999,
              padding: "2px 8px",
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {data.riskLevel}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Days to breach</span>
          <span style={{ fontWeight: 600 }}>{data.daysToBreach}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Scheduling gap</span>
          <span style={{ fontWeight: 600 }}>{data.schedulingGap}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Open tasks</span>
          <span style={{ fontWeight: 600 }}>{data.openTasks}</span>
        </div>
      </div>
    </div>
  );
}
