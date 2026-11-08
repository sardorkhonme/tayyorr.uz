import { requireAdmin } from "@/lib/admin";
import { StatsView } from "@/components/admin/stats/stats-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistika" };

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ r?: string; day?: string }> }) {
  await requireAdmin();
  const { r, day } = await searchParams;
  return <StatsView range={r ?? "30"} day={day} />;
}
