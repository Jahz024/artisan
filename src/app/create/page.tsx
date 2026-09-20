import Link from "next/link";
import { CreatePlanWizard } from "@/components/create/CreatePlanWizard";

export default function CreatePlanPage() {
  return (
    <div className="min-h-full bg-circuit-grid">
      <div className="border-b border-slate-800/80 bg-slate-950/50 px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-slate-200">
          Hokie <span className="text-cyan-400">Pathfinder</span>
        </Link>
      </div>
      <CreatePlanWizard />
    </div>
  );
}
