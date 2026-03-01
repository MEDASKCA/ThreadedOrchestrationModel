import { Calendar, ChevronDown, File, UserCircle } from "lucide-react";

type ThreadHeaderProps = {
  title: string;
  status: string;
  priority: string;
  owner: string;
  riskLabel?: string;
  onStatusChange: (value: string) => void;
  onReassign: () => void;
  onDueDate: () => void;
  onFiles: () => void;
};

export default function ThreadHeader({
  title,
  status,
  priority,
  owner,
  riskLabel,
  onStatusChange,
  onReassign,
  onDueDate,
  onFiles,
}: ThreadHeaderProps) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      {riskLabel && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            background: "#fee2e2",
            color: "#b91c1c",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {riskLabel}
        </div>
      )}

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
            {title}
          </div>
          <div
            className="mt-2 flex flex-wrap items-center gap-3"
            style={{ fontSize: 13, color: "#475569" }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #e2e8f0",
                borderRadius: 999,
                padding: "4px 10px",
                background: "#f8fafc",
              }}
            >
              <select
                value={status}
                onChange={(event) => onStatusChange(event.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0f172a",
                  outline: "none",
                }}
              >
                {["open", "awaiting_response", "in_progress", "escalated", "resolved"].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value.replace("_", " ")}
                    </option>
                  )
                )}
              </select>
              <ChevronDown style={{ width: 12, height: 12 }} />
            </label>

            <span
              style={{
                borderRadius: 999,
                padding: "4px 10px",
                background: "#e2e8f0",
                fontSize: 12,
                fontWeight: 600,
                color: "#0f172a",
                textTransform: "capitalize",
              }}
            >
              {priority}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 12,
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              <UserCircle style={{ width: 14, height: 14 }} />
              {owner}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onStatusChange.bind(null, status)}
            style={{
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "#0f172a",
              fontWeight: 600,
            }}
          >
            Change status
          </button>
          <button
            onClick={onReassign}
            style={{
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "#0f172a",
              fontWeight: 600,
            }}
          >
            Reassign
          </button>
          <button
            onClick={onDueDate}
            style={{
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "#0f172a",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Calendar style={{ width: 14, height: 14 }} />
            Add due date
          </button>
          <button
            onClick={onFiles}
            style={{
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "#0f172a",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <File style={{ width: 14, height: 14 }} />
            Files
          </button>
        </div>
      </div>
    </div>
  );
}
