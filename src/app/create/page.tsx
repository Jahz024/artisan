import Link from "next/link";
import { CreatePlanWizard } from "@/components/create/CreatePlanWizard";

export default function CreatePlanPage() {
  return (
    <div className="min-h-full bg-circuit-grid">
      <div className="border-b border-slate-800/80 bg-slate-950/50 px-6 py-4">
        <Link href="/" className="font-mono-accent text-xl font-extrabold text-[var(--ink)]">
          Artisan
        </Link>
      </div>
      <CreatePlanWizard />
    </div>
  );
}
