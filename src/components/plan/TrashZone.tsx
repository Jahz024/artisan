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
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1, scale: isOver ? 1.08 : 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          ref={setNodeRef}
          className={cn(
            "fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border-[3px] px-7 py-3.5 transition-colors",
            isOver
              ? "border-[var(--ink)] bg-[var(--danger)] text-white"
              : "border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)]"
          )}
          style={{ boxShadow: "0 10px 30px rgba(29, 26, 36, 0.25)" }}
          aria-label="Drop here to remove course"
        >
          <motion.div
            animate={isOver ? { rotate: [0, -12, 12, 0] } : { rotate: 0 }}
            transition={{ repeat: isOver ? Infinity : 0, duration: 0.45 }}
          >
            <Trash2 className="h-6 w-6" />
          </motion.div>
          <span className="font-mono-accent text-lg font-bold">
            {isOver ? "Release to remove this stop" : "Drop here to remove"}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
