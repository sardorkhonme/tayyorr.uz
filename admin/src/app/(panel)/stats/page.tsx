import { requireAdmin } from "@/lib/admin";
import { resolvePeriod } from "@/lib/stats";
import { StatsView } from "@/components/admin/stats/stats-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistika" };

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ r?: string; from?: string; to?: string; day?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const period = await resolvePeriod(sp);
  return (
    <div className="flex flex-col gap-5">
      <StatsView period={period} day={sp.day} />
    </div>
  );
}
