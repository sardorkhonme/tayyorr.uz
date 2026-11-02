import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { currentUser } from "@/auth";
import { ClickReceiptButton } from "@/components/click-receipt-button";
import { Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { som } from "@/lib/format";
import { TXN_LABEL } from "@/lib/wallet";

export const metadata = { title: "Chek" };

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Amal cheki — tayyorr.uz dagi bilan bir xil maydonlar. */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const t = await db.walletTransaction.findUnique({ where: { id } });
  if (!t || t.userId !== user.id) notFound();

  const reversed = !!t.reversedAt;
  const rows: [string, string][] = [
    ["Amal ID", t.id],
    ["Sana", dateFmt.format(t.createdAt)],
    ["Tur", TXN_LABEL[t.type] ?? t.type],
    ["Summa", `${reversed ? "−" : ""}${som(t.amount)}`],
    ["Usul", t.method],
    ["Holat", reversed ? "BEKOR QILINGAN" : t.status],
    ...(t.note ? ([["Izoh", t.note]] as [string, string][]) : []),
    ...(reversed ? ([["Bekor qilingan", dateFmt.format(t.reversedAt!)]] as [string, string][]) : []),
  ];

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/wallet" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900">
        <Icon name="arrow-left" className="h-4 w-4" /> Hamyon
      </Link>

      <div className="card !rounded-3xl p-6 sm:p-7">
        <h1 className="font-display text-2xl font-bold text-zinc-900">Chek</h1>
        <dl className="mt-5 divide-y divide-zinc-100 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-zinc-500">{k}</dt>
              <dd
                className={`break-all text-right font-mono ${
                  reversed && (k === "Summa" || k === "Holat") ? "text-red-600" : "text-zinc-900"
                }`}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {t.method === "CLICK" && <ClickReceiptButton id={t.id} />}
    </div>
  );
}
