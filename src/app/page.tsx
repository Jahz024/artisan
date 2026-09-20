import { getServerSession } from "@/lib/auth";
import { HomeDashboard } from "@/components/home/HomeDashboard";

export default async function HomePage() {
  const session = await getServerSession();
  return <HomeDashboard session={session} />;
}
