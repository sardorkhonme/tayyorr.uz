import Link from "next/link";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { StarIcon } from "@/components/icons";

const TYPE_LABEL: Record<string, string> = {
  PRESENTATION: "Prezentatsiya",
  COURSE_WORK: "Kurs işi",
  REFERAT: "Referat",
  ESSAY: "Esse",
  DIPLOMA: "Diplom işi",
  OTHER: "Boşqa",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  OPEN: "Oçiq",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topşirilgan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

const OFFER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Körib çiqilmoqda",
  ACCEPTED: "Qabul qilindi",
  REJECTED: "Rad etildi",
  WITHDRAWN: "Qaytarib olindi",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Hammasi" },
  { value: "OPEN", label: "Oçiq" },
  { value: "IN_PROGRESS", label: "Jarayonda" },
  { value: "DELIVERED", label: "Topşirilgan" },
  { value: "DONE", label: "Yakunlangan" },
  { value: "CANCELLED", label: "Bekor qilingan" },
];

export default async function MyOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const me = session!.user;
  if (me.role !== "PREPARER") redirect("/dashboard");

  const { status } = await searchParams;
  const filter = FILTERS.some((f) => f.value === status) ? status! : "ALL";

  const offers = await db.offer.findMany({
    where: {
      preparerId: me.id,
      ...(filter !== "ALL"
        ? { order: { status: filter as OrderStatus } }
        : {}),
    },
    include: {
      order: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          budget: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Mening takliflarim
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Siz yuborgan barça takliflar (arizalar) şu yerda.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "ALL" ? "/offers" : `/offers?status=${f.value}`}
            className={`backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.value
                ? "bg-indigo-500/20 text-indigo-300"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {offers.length === 0 ? (
        <div className="card text-sm text-zinc-500">
          Bu holatda taklif topilmadi.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {offers.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.orderId}`}
                className="card flex flex-col gap-2 transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">
                      {o.order.title}
                      {o.order.deletedAt && (
                        <span className="ml-2 text-xs text-amber-400">
                          (öçirilgan)
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {TYPE_LABEL[o.order.type] ?? o.order.type} ·{" "}
                      {ORDER_STATUS_LABEL[o.order.status] ?? o.order.status}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-amber-300">
                    {o.starsSpent} <StarIcon className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-zinc-300">
                    Narx: <b>{o.price.toLocaleString("ru-RU")} söm</b>
                  </span>
                  <span
                    className={
                      o.status === "ACCEPTED"
                        ? "text-emerald-400"
                        : o.status === "REJECTED"
                          ? "text-red-400"
                          : "text-zinc-400"
                    }
                  >
                    {OFFER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                {o.message && (
                  <p className="line-clamp-2 text-sm text-zinc-400">
                    {o.message}
                  </p>
                )}
                <p className="text-xs text-zinc-600">
                  {shortDateTime(o.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
