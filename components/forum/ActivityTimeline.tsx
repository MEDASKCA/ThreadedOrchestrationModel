import ActivityItemCard from "./ActivityItemCard";

type ActivityItem = {
  id: string;
  author: string;
  timestamp: string;
  body: string;
  source: string;
  isSystem?: boolean;
  isAlert?: boolean;
};

type ActivityTimelineProps = {
  items: ActivityItem[];
  onReply?: (id: string) => void;
};

export default function ActivityTimeline({ items, onReply }: ActivityTimelineProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex gap-4">
          <div
            style={{
              width: 16,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: item.isSystem ? "#a5b4fc" : "#0ea5e9",
                marginTop: 6,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <ActivityItemCard item={item} onReply={() => onReply?.(item.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}
