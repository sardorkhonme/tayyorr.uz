import { requireAdmin } from "@/lib/admin";
import { resolvePeriod } from "@/lib/stats";
import { StatsView } from "@/components/admin/stats/stats-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistika" };

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ r?: string; from?: string; to?: string; day?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  return <StatsView period={await resolvePeriod(sp)} day={sp.day} />;
}
