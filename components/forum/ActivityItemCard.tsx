import { formatActorDisplayName } from "@/lib/display";

type ActivityItem = {
  id: string;
  author: string;
  timestamp: string;
  body: string;
  source: string;
  isSystem?: boolean;
  isAlert?: boolean;
};

type ActivityItemCardProps = {
  item: ActivityItem;
  onReply?: () => void;
};

export default function ActivityItemCard({ item, onReply }: ActivityItemCardProps) {
  const authorName = formatActorDisplayName({
    name: item.author,
    isSystem: item.isSystem,
  });

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#ffffff",
        padding: "12px 14px",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span style={{ fontWeight: 700, color: "#0f172a" }}>{authorName}</span>
        <span>{item.timestamp}</span>
        <span
          style={{
            borderRadius: 6,
            background: "#f1f5f9",
            padding: "2px 6px",
            fontSize: 10,
            color: "#64748b",
          }}
        >
          {item.source}
        </span>
        {item.isSystem && (
          <span
            style={{
              borderRadius: 6,
              background: "#eef2ff",
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 700,
              color: "#4f46e5",
            }}
          >
            TOM
          </span>
        )}
        {item.isAlert && (
          <span
            style={{
              borderRadius: 6,
              background: "#fee2e2",
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 700,
              color: "#b91c1c",
            }}
          >
            ALERT
          </span>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.6 }}>
        {item.body}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <button
          onClick={onReply}
          style={{
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 11,
            color: "#475569",
            cursor: "pointer",
          }}
        >
          Reply
        </button>
        <button
          style={{
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 11,
            color: "#475569",
            cursor: "pointer",
          }}
        >
          ⚠️
        </button>
        <button
          style={{
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 11,
            color: "#475569",
            cursor: "pointer",
          }}
        >
          ✅
        </button>
        {item.isAlert && (
          <button
            style={{
              marginLeft: "auto",
              border: "1px solid #e2e8f0",
              background: "#f1f5f9",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 11,
              color: "#0f172a",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            View pathway
          </button>
        )}
      </div>
    </div>
  );
}
