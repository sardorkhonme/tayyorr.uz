import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { currentUser } from "@/auth";
import { PayForm } from "@/components/pay-form";
import { payPlatform } from "@/lib/pay";
import { safeNext } from "@/lib/sso";

export const dynamic = "force-dynamic";
export const metadata = { title: "To'lov" };

/**
 * plus.tayyorr.uz/pay?return=<manzil> — barcha platformalar uchun yagona to'lov sahifasi.
 * Hamyon bitta: qaysi platformadan to'ldirilsa ham balans hamma joyda bir xil.
 */
export default async function PayPage({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const sp = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "plus.tayyorr.uz";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const returnTo = safeNext(sp.return) ?? `${origin}/wallet`;

  const user = await currentUser();
  if (!user) {
    const self = `${origin}/pay?return=${encodeURIComponent(returnTo)}`;
    redirect(`/login?next=${encodeURIComponent(self)}`);
  }

  return <PayForm returnTo={returnTo} platform={payPlatform(returnTo).label} />;
}
