import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { blockState } from "@/lib/chat";
import { Stars } from "@/components/stars";
import { BackLink } from "@/components/back-link";
import { BlockedIcon } from "@/components/icons";
import { presenceText } from "@/lib/presence";
import { shortDate } from "@/lib/date";
import { maskName } from "@/lib/mask-name";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Oçiq",
  IN_PROGRESS: "Jarayonda",
  DELIVERED: "Topşirilgan",
  DONE: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

const TYPE_LABEL: Record<string, string> = {
  PRESENTATION: "Prezentatsiya",
  COURSE_WORK: "Kurs işi",
  REFERAT: "Referat",
  ESSAY: "Esse",
  DIPLOMA: "Diplom işi",
  OTHER: "Boşqa",
};

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user?.id;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      login: true,
      email: true,
      role: true,
      about: true,
      avatarUrl: true,
      image: true,
      ratingSum: true,
      ratingCount: true,
      isSupport: true,
      isPlatform: true,
      lastSeenAt: true,
      createdAt: true,
      _count: { select: { ordersCreated: true, ordersTaken: true } },
    },
  });
  if (!user || user.isSupport || user.isPlatform) notFound();

  const blockedMe =
    !!me && me !== id && (await blockState(me, id)).blockedMe;

  // Email faqat profil egasining o'ziga to'liq ko'rinadi — boshqalarga
  // har doim yarmi yashiringan (blur) holatda ko'rsatiladi, kontaktni
  // to'g'ridan-to'g'ri ulashib yubormaslik uchun.
  const isOwner = me === id;

  const displayName =
    user.name ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    "Foydalanuvçi";

  if (blockedMe) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <BackLink fallback="/messages" />
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500">
            <BlockedIcon className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-semibold text-white">{displayName}</h1>
        </div>
        {user.about && (
          <div className="card">
            <p className="whitespace-pre-wrap text-sm text-zinc-300">
              {user.about}
            </p>
          </div>
        )}
      </div>
    );
  }

  const avg = user.ratingCount ? user.ratingSum / user.ratingCount : 0;
  const isPreparerProfile = user.role === "PREPARER";

  // PREPARER: bajarilgan ishlar (portfolio)
  // ORDERER: bergan (yaratgan) buyurtmalari — hammaga ko'rinadi
  const doneOrders = isPreparerProfile
    ? await db.order.findMany({
        where: { preparerId: id, status: "DONE" },
        orderBy: { updatedAt: "desc" },
        take: 100,
        include: { review: true },
      })
    : user.role === "ORDERER"
      ? await db.order.findMany({
          where: { ordererId: id, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 60,
          include: { review: true },
        })
      : [];
  const showDone = !!user.role;
  const doneTitle = isPreparerProfile
    ? "Bajarilgan işlar"
    : "Berilgan buyurtmalar";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink fallback="/messages" />

      {/* bosh qism */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
          {(user.avatarUrl ?? user.image) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl ?? user.image ?? ""}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-white">
            {user.name ||
              `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
              "—"}
          </h1>
          <div className="mt-0.5 text-sm text-zinc-500">
            @{user.login ?? "—"} ·{" "}
            {user.role === "PREPARER"
              ? "Tayyorlovçi"
              : user.role === "ORDERER"
                ? "Buyurtma beruvçi"
                : "—"}
          </div>
          {(() => {
            const p = presenceText(user.lastSeenAt);
            return (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    p.online ? "bg-emerald-400" : "bg-zinc-600"
                  }`}
                />
                <span className={p.online ? "text-emerald-400" : "text-zinc-500"}>
                  {p.text}
                </span>
              </div>
            );
          })()}
          {user.role === "PREPARER" && (
            <div className="mt-1.5 flex items-center gap-2">
              <Stars value={avg} size="md" />
              <span className="text-sm text-zinc-300">
                {user.ratingCount ? avg.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-zinc-500">
                ({user.ratingCount} baho)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ma'lumotlar */}
      <div className="card">
        <dl className="divide-y divide-white/5 text-sm">
          <Row k="Email" v={<MaskedEmail email={user.email} full={isOwner} />} />
          <Row
            k="Röyxatdan ötgan"
            v={shortDate(user.createdAt)}
          />
          {user.role === "PREPARER" ? (
            <Row k="Olingan işlar" v={String(user._count.ordersTaken)} />
          ) : (
            <Row k="Berilgan buyurtmalar" v={String(user._count.ordersCreated)} />
          )}
        </dl>
        {user.about && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
            {user.about}
          </p>
        )}
      </div>

      {/* bajarilgan ishlar / yakunlangan buyurtmalar */}
      {showDone && (
        <div>
          <h2 className="mb-3 font-semibold text-white">
            {doneTitle} ({doneOrders.length})
          </h2>
          {doneOrders.length === 0 ? (
            <div className="card text-sm text-zinc-500">Hozirça yöq.</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {doneOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="card block transition hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">
                          {o.title}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {TYPE_LABEL[o.type] ?? o.type} ·{" "}
                          {shortDate(isPreparerProfile ? o.updatedAt : o.createdAt)}
                          {!isPreparerProfile &&
                            ` · ${STATUS_LABEL[o.status] ?? o.status}`}
                        </div>
                      </div>
                      {isPreparerProfile &&
                        (o.review ? (
                          <div className="shrink-0 text-right">
                            <Stars value={o.review.stars} />
                            <div className="text-xs text-zinc-400">
                              {o.review.stars}.0
                            </div>
                          </div>
                        ) : (
                          <span className="shrink-0 text-xs text-zinc-600">
                            baholanmagan
                          </span>
                        ))}
                    </div>
                    {isPreparerProfile && o.review?.comment && (
                      <p className="mt-2 text-sm text-zinc-400">
                        «{o.review.comment}»
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-zinc-500">{k}</dt>
      <dd className="text-right text-zinc-200">{v}</dd>
    </div>
  );
}

/** Email — profil egasiga to'liq, boshqalarga har doim yarmi blur holatda. */
function MaskedEmail({ email, full }: { email: string | null; full: boolean }) {
  if (!email) return <>—</>;
  if (full) return <>{email}</>;
  const { visible, hiddenLen } = maskName(email);
  return (
    <>
      {visible}
      <span aria-hidden className="select-none blur-[3px]">
        {"•".repeat(Math.min(hiddenLen, 14))}
      </span>
    </>
  );
}
