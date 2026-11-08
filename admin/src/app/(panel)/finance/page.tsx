import { requireAdmin } from "@/lib/admin";
import { FinanceView } from "@/components/admin/finance-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moliya" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ r?: string; t?: string; lim?: string }> }) {
  await requireAdmin();
  const { r, t, lim } = await searchParams;
  // jadval: ?t= turi, ?lim= nechta qator (100 tadan, ko'pi bilan 2000)
  const limit = Math.min(Math.max(Number(lim) || 100, 100), 2000);
  return <FinanceView range={r ?? "30"} kind={t ?? "all"} limit={limit} />;
}
