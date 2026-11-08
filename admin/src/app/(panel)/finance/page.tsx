import { requireAdmin } from "@/lib/admin";
import { FinanceView } from "@/components/admin/finance-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moliya" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await requireAdmin();
  const { r } = await searchParams;
  return <FinanceView range={r ?? "30"} />;
}
