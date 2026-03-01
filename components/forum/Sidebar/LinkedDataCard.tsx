type LinkedData = {
  patientId?: string;
  pathwayId?: string;
  resourceId?: string;
};

type LinkedDataCardProps = {
  data: LinkedData;
};

export default function LinkedDataCard({ data }: LinkedDataCardProps) {
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
        Linked data
      </div>
      <div className="mt-3 space-y-3 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span>Patient</span>
          <button
            style={{
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 12,
              color: "#475569",
            }}
          >
            {data.patientId ? "Unlink" : "Link"}
          </button>
        </div>
        <div className="text-xs text-slate-500">{data.patientId || "Not linked"}</div>
        <div className="flex items-center justify-between">
          <span>Pathway</span>
          <button
            style={{
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 12,
              color: "#475569",
            }}
          >
            {data.pathwayId ? "Unlink" : "Link"}
          </button>
        </div>
        <div className="text-xs text-slate-500">{data.pathwayId || "Not linked"}</div>
        <div className="flex items-center justify-between">
          <span>Resource</span>
          <button
            style={{
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 12,
              color: "#475569",
            }}
          >
            {data.resourceId ? "Unlink" : "Link"}
          </button>
        </div>
        <div className="text-xs text-slate-500">{data.resourceId || "Not linked"}</div>
      </div>
    </div>
  );
}
