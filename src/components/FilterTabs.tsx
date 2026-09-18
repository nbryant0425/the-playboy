import type { OwnershipFilter } from "@/lib/data";

const OPTIONS: { value: OwnershipFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "missing", label: "Missing" },
];

export function FilterTabs({ value, onChange }: { value: OwnershipFilter; onChange: (v: OwnershipFilter) => void }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-paper-card p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            value === opt.value ? "bg-ink text-paper-card" : "text-ink-soft hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
