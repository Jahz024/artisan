"use client";

import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrashZoneProps {
  visible: boolean;
}

export function TrashZone({ visible }: TrashZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "trash-zone" });

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          ref={setNodeRef}
          className={cn(
            "fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-8 py-4 backdrop-blur-md",
            isOver
              ? "border-red-400 bg-red-500/25 shadow-[var(--glow-red)] scale-105"
              : "border-red-500/30 bg-slate-900/90"
          )}
          aria-label="Drop here to remove course"
        >
          <motion.div
            animate={isOver ? { rotate: [0, -8, 8, 0], scale: [1, 0.9, 1] } : { rotate: 0 }}
            transition={{ repeat: isOver ? Infinity : 0, duration: 0.5 }}
          >
            <Trash2 className={cn("h-6 w-6", isOver ? "text-red-200" : "text-red-400/80")} />
          </motion.div>
          <span className="text-sm font-medium text-red-100">
            {isOver ? "Release to remove" : "Drag here to trash"}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
