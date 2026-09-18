"use client";

import { motion } from "framer-motion";

export type ViewMode = "month" | "year";

export function ViewModeSwitcher({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="relative mx-auto flex w-full max-w-xs rounded-full border border-line bg-paper-card p-1">
      <motion.div
        className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-red"
        animate={{ left: mode === "year" ? "4px" : "calc(50% + 0px)" }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
      />
      {(["year", "month"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`relative z-10 flex-1 rounded-full py-2 text-sm font-display font-semibold uppercase tracking-wide transition-colors ${
            mode === m ? "text-paper-card" : "text-ink-soft"
          }`}
        >
          {m === "year" ? "By Year" : "By Month"}
        </button>
      ))}
    </div>
  );
}
