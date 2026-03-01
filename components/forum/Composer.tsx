import { Paperclip, Send, Smile } from "lucide-react";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function Composer({ value, onChange, onSend }: ComposerProps) {
  return (
    <div
      style={{
        borderTop: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: "12px 20px",
      }}
    >
      <div className="flex items-end gap-3">
        <div
          style={{
            flex: 1,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#f8fafc",
            padding: "10px 12px",
          }}
        >
          <textarea
            rows={3}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="@Mention or leave an update…"
            style={{
              width: "100%",
              resize: "none",
              border: "none",
              background: "transparent",
              fontSize: 14.5,
              color: "#0f172a",
              outline: "none",
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              style={{
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 12,
                color: "#475569",
              }}
            >
              <Paperclip style={{ width: 14, height: 14 }} />
            </button>
            <button
              style={{
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 12,
                color: "#475569",
              }}
            >
              <Smile style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
        <button
          onClick={onSend}
          style={{
            borderRadius: 10,
            border: "none",
            padding: "12px 14px",
            background: "#0ea5e9",
            color: "#ffffff",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 600,
          }}
        >
          <Send style={{ width: 16, height: 16 }} />
          Send
        </button>
      </div>
    </div>
  );
}
