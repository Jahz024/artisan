import Link from "next/link";
import { CreatePlanWizard } from "@/components/create/CreatePlanWizard";

export default function CreatePlanPage() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-slate-800">
          Hokie <span className="text-[var(--vt-orange)]">Pathfinder</span>
        </Link>
      </div>
      <CreatePlanWizard />
    </div>
  );
}
