type Tab = {
  key: string;
  label: string;
};

type ThreadTabsProps = {
  tabs: Tab[];
  active: string;
  onChange: (value: string) => void;
};

export default function ThreadTabs({ tabs, active, onChange }: ThreadTabsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 20px",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            border: "1px solid #e2e8f0",
            background: active === tab.key ? "#e0f2fe" : "#ffffff",
            color: active === tab.key ? "#0284c7" : "#475569",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: active === tab.key ? 700 : 600,
            cursor: "pointer",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
