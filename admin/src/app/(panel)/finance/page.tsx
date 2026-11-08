import { requireAdmin } from "@/lib/admin";
import { resolvePeriod } from "@/lib/stats";
import { FinanceView } from "@/components/admin/finance-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moliya" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; from?: string; to?: string; t?: string; lim?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  // jadval: ?t= turi, ?lim= nechta qator (100 tadan, ko'pi bilan 2000)
  const limit = Math.min(Math.max(Number(sp.lim) || 100, 100), 2000);
  return <FinanceView period={await resolvePeriod(sp)} kind={sp.t ?? "all"} limit={limit} />;
}
