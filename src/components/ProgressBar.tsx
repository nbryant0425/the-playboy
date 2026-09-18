export function ProgressBar({ owned, total }: { owned: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((owned / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-card-alt">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-dark to-red transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="whitespace-nowrap font-display text-sm text-ink-soft">
        <span className="text-ink font-semibold">{owned}</span> / {total} collected
      </p>
    </div>
  );
}
