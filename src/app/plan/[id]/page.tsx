import { Suspense } from "react";
import { PlanViewClient } from "@/components/plan/PlanViewClient";

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
          Loading…
        </div>
      }
    >
      <PlanViewClient />
    </Suspense>
  );
}
