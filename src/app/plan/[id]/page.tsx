import { Suspense } from "react";
import { PlanViewClient } from "@/components/plan/PlanViewClient";

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-circuit-grid text-slate-400">
          Loading…
        </div>
      }
    >
      <PlanViewClient />
    </Suspense>
  );
}
