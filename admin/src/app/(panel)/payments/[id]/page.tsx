import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { ClickPaymentActions } from "@/components/admin/click-payment-actions";
import { ClickReceiptButton } from "@/components/click-receipt-button";
import { shortDateTime } from "@/lib/date";

export default async function AdminPaymentReceipt({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await db.walletTransaction.findUnique({
    where: { id },
    include: { user: { select: { id: true, login: true, name: true, balance: true } } },
  });
  if (!t) notFound();

  const meta = (t.meta ?? {}) as Record<string, unknown>;

  const rows: [string, string][] = [
    ["Amal ID", t.id],
    ["Sana", shortDateTime(t.createdAt)],
    ["Foydalanuvçi", `@${t.user.login ?? t.user.name ?? t.user.id}`],
    ["Tur", t.type],
    ["Summa", `${t.reversedAt ? "−" : ""}${formatSom(t.amount)}`],
    ["Usul", t.method],
    ["Holat", t.reversedAt ? "BEKOR QILINGAN" : t.status],
    ["Izoh", t.note ?? "—"],
    ["Karta", typeof meta.card === "string" ? meta.card : "—"],
    ["Demo", meta.demo ? "ha" : "yöq"],
    ["Bekor qilingan", t.reversedAt ? shortDateTime(t.reversedAt) : "—"],
    ["Foydalanuvçi joriy balansi", formatSom(t.user.balance)],
  ];

  const canReverse = !t.reversedAt && t.status === "SUCCESS";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href="/payments"
        className="text-sm text-zinc-500 hover:text-white"
      >
        ← Tölovlar
      </Link>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-lg font-semibold text-white">Çek</h1>
        <dl className="mt-4 divide-y divide-white/5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-zinc-500">{k}</dt>
              <dd
                className={`text-right font-mono ${
                  t.reversedAt && (k === "Summa" || k === "Holat")
                    ? "text-red-400"
                    : "text-zinc-200"
                }`}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {t.method === "CLICK" && (
        <>
          <ClickPaymentActions txnId={t.id} canReverse={canReverse} />
          <ClickReceiptButton apiBase={`/api/admin/payments/${t.id}`} />
        </>
      )}

      {canReverse ? (
        <div className="flex flex-col gap-1">
          <AdminPostButton
            url={`/api/admin/payments/${t.id}/reverse`}
            label="Faqat içki hisobni töğirlaş"
            className="btn-ghost w-fit"
            confirmText="Bu faqat bizning hamyon balansimizni töğirlaydi — Clickʼga (kartaga qaytariş) signal yubormaydi. Davom etilsinmi?"
          />
          {t.method === "CLICK" && (
            <p className="text-xs text-zinc-600">
              Kartaga qaytariş uçun yuqoridagi &quot;Click orqali
              qaytariş&quot; tugmasidan foydalaning.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Bu amalni bekor qilib bölmaydi.
        </p>
      )}
    </div>
  );
}
