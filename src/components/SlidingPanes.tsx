"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ViewMode } from "./ViewModeSwitcher";

export function SlidingPanes({ mode, yearView, monthView }: { mode: ViewMode; yearView: ReactNode; monthView: ReactNode }) {
  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex w-[200%]"
        animate={{ x: mode === "year" ? "0%" : "-50%" }}
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
      >
        <div className="w-1/2 min-w-0 pr-2">{yearView}</div>
        <div className="w-1/2 min-w-0 pl-2">{monthView}</div>
      </motion.div>
    </div>
  );
}
