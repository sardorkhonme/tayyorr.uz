import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";
import { getRestriction } from "@/lib/restriction";
import { presenceText } from "@/lib/presence";
import { RestrictionNotice } from "@/components/restriction-notice";
import { OrderActions } from "@/components/order-actions";
import { OrderDeleteButton } from "@/components/order-delete-button";
import { BackLink } from "@/components/back-link";
import { OrderCreatedBanner } from "@/components/order-created-banner";
import { shortDateTime } from "@/lib/date";
import { sweepContracts } from "@/lib/contract-flow";
import { contractView } from "@/lib/contract-view";
import { maskName } from "@/lib/mask-name";
import { Icon, type IconName } from "@/components/icons";
import { STATUS_CLS, STATUS_LABEL, TYPE_LABEL } from "@/lib/order-labels";
import { getMinOfferStars } from "@/lib/stars";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const restriction = await getRestriction(session!.user.id);
  if (restriction) return <RestrictionNotice restriction={restriction} />;
  const me = session!.user;
  // muddati o'tgan shartnoma bo'lsa — sahifa ko'rsatilishidan oldin hal qilinadi
  await sweepContracts({ orderId: id });

  const order = await db.order.findUnique({
    where: { id },
    include: {
      orderer: {
        select: {
          id: true,
          name: true,
          login: true,
          avatarUrl: true,
          image: true,
          lastSeenAt: true,
        },
      },
      preparer: {
        select: {
          id: true,
          name: true,
          login: true,
          avatarUrl: true,
          image: true,
          lastSeenAt: true,
        },
      },
      offers: {
        include: {
          preparer: {
            select: {
              id: true,
              name: true,
              login: true,
              ratingCount: true,
              ratingSum: true,
              about: true,
              avatarUrl: true,
              image: true,
            },
          },
        },
        // navbat: ko'proq star sarflagan yuqorida, teng bo'lsa birinchi
        // yuborgan yuqorida
        orderBy: [{ starsSpent: "desc" }, { createdAt: "asc" }],
      },
      files: true,
      review: true,
      contracts: {
        orderBy: { createdAt: "desc" },
        include: {
          preparer: { select: { name: true, login: true } },
        },
      },
    },
  });

  if (!order) notFound();

  const isOrderer = order.ordererId === me.id;
  const isPreparer = me.role === "PREPARER";
  const isAssigned = order.preparerId === me.id;
  const hasOffered = order.offers.some((o) => o.preparerId === me.id);
  const isParty = isOrderer || isAssigned;

  // OPEN bo'lmagan / o'chirilgan buyurtma — ishtirokchilarga VA taklif
  // yuborgan (garchi tanlanmagan) tayyorlovchilarga ham ko'rinadi. Aks
  // holda ish boshqasiga o'tgach yoki yakunlangach ular uchun butunlay
  // yo'qolib qolib, shubha uyg'otardi.
  if (!isParty && !hasOffered && (order.status !== "OPEN" || order.deletedAt)) {
    notFound();
  }
  const deleted = !!order.deletedAt;
  // imzolangan faol shartnoma bor — buyurtmani o'chirib bo'lmaydi
  const locked =
    (order.status === "IN_PROGRESS" || order.status === "DELIVERED") &&
    order.contracts.some((c) => c.status === "ACCEPTED");

  // takliflar: buyurtma egasiga hammasi (to'liq ism), tayyorlovchiga faqat o'ziniki
  const visibleOffers = isOrderer
    ? order.offers
    : order.offers.filter((o) => o.preparerId === me.id);
  const myOffer = order.offers.find((o) => o.preparerId === me.id) ?? null;

  // navbat: boshqa tayyorlovchilarga o'rin/star ko'rinadi, lekin ism
  // serverda qisman yashiriladi (haqiqiy ism mijozga umuman yuborilmaydi)
  const queue =
    isPreparer && !isOrderer
      ? order.offers.map((o, i) => {
          const mine = o.preparerId === me.id;
          const displayName = o.preparer.name ?? o.preparer.login ?? "Tayyorlovçi";
          return {
            position: i + 1,
            mine,
            starsSpent: o.starsSpent,
            ...(mine
              ? { visible: displayName, hiddenLen: 0 }
              : maskName(displayName, 0.2)), // ozgina boshi ochiq, qolgani blur
          };
        })
      : [];

  const files = await Promise.all(
    order.files.map(async (f) => ({
      id: f.id,
      kind: f.kind,
      mimeType: f.mimeType,
      size: f.size,
      url: isParty
        ? await presignGet({ bucket: PRIVATE_BUCKET, key: f.key })
        : null,
    })),
  );

  const isViewer = !isOrderer && !isPreparer; // boshqa buyurtmachi — faqat ko'radi
  const facts: { icon: IconName; label: string; value: string }[] = [
    {
      icon: "coins",
      label: "Byudjet",
      value: order.budget ? `${order.budget.toLocaleString("ru-RU")} söm` : "Kelişiladi",
    },
    {
      icon: "calendar",
      label: "Muddat",
      value: order.deadline ? shortDateTime(order.deadline) : "Belgilanmagan",
    },
    { icon: "hand", label: "Takliflar", value: `${order.offers.length} ta` },
    { icon: "clock", label: "Yaratilgan", value: shortDateTime(order.createdAt) },
  ];
  const people = [
    !isOrderer ? { person: order.orderer, role: "Buyurtmaçi" } : null,
    order.preparer && !isAssigned
      ? { person: order.preparer, role: "Tayyorlovçi" }
      : null,
  ].filter((x): x is { person: Person; role: string } => !!x);

  return (
    <div className="flex flex-col gap-4">
      <BackLink fallback={isOrderer ? "/orders" : "/dashboard"} />

      {isOrderer && !deleted && <OrderCreatedBanner orderId={order.id} />}

      {deleted && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm">
          <div className="flex items-center gap-1.5 font-semibold text-red-300">
            <Icon name="trash" className="h-4 w-4" />
            Bu buyurtma öçirilgan
          </div>
          <div className="mt-1 text-zinc-400">
            {order.deletedByRole === "ADMIN"
              ? "Administrator tomonidan"
              : "Buyurtmaçi tomonidan"}
            {order.deletedAt && ` · ${shortDateTime(order.deletedAt)}`}
          </div>
          {order.deleteReason && (
            <div className="mt-1 text-zinc-300">Sabab: {order.deleteReason}</div>
          )}
          <div className="mt-1 text-xs text-zinc-500">
            U faqat sizga körinadi, boşqalarga emas.
          </div>
        </div>
      )}

      {/* 1. sarlavha va holat */}
      <section className="card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300">
            {TYPE_LABEL[order.type] ?? order.type}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              STATUS_CLS[order.status] ?? "bg-white/10 text-zinc-300"
            }`}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        <h1 className="mt-3 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {order.title}
        </h1>
      </section>

      {/* 2. asosiy faktlar — bir xil o'lchamdagi kataklar */}
      <section className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="card flex min-w-0 flex-col justify-between gap-2 p-3.5 sm:p-4">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Icon name={f.icon} className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{f.label}</span>
            </span>
            <span className="truncate text-sm font-semibold text-white">{f.value}</span>
          </div>
        ))}
      </section>

      {/* ishtirokchilar */}
      {people.length > 0 && (
        <section
          className={`grid auto-rows-fr gap-2.5 ${people.length > 1 ? "sm:grid-cols-2" : ""}`}
        >
          {people.map((p) => (
            <PersonCard key={p.role} person={p.person} role={p.role} />
          ))}
        </section>
      )}

      {/* 3. tavsif */}
      <section className="card">
        <h2 className="mb-2 text-sm font-semibold text-white">Tavsif</h2>
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
          {order.description}
        </div>
      </section>

      {/* 4. fayllar */}
      {files.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-white">
            Fayllar ({files.length})
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {files.map((f) => {
              const inner = (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
                    <Icon name="paperclip" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{f.kind}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {f.url ? `${(f.size / 1024).toFixed(0)} KB` : "Faqat iştirokçilarga oçiq"}
                    </span>
                  </span>
                  {f.url && <Icon name="download" className="h-4 w-4 shrink-0 text-zinc-500" />}
                </>
              );
              return (
                <li key={f.id}>
                  {f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition hover:bg-white/[0.06]"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="flex h-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 opacity-70">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* buyurtmachi boshqaning buyurtmasini ko'rmoqda — faqat ko'rish */}
      {isViewer && !deleted && (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
          <Icon name="eye" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <span>
            Bu boşqa foydalanuvçining buyurtmasi — siz uni faqat köra olasiz.
            Taklif yuboriş faqat tayyorlovçilar uçun.
          </span>
        </div>
      )}

      {/* 5. takliflar / şartnoma / amallar */}
      {!deleted && !isViewer && (
        <OrderActions
          orderId={order.id}
          status={order.status}
          isOrderer={isOrderer}
          isPreparer={isPreparer}
          isAssigned={isAssigned}
          ordererId={order.ordererId}
          meId={me.id}
          orderDeadline={order.deadline?.toISOString() ?? null}
          contracts={order.contracts.map((c) => contractView(c, order))}
          minOfferStars={await getMinOfferStars()}
          reviewed={!!order.review}
          myReview={
            order.review
              ? { stars: order.review.stars, comment: order.review.comment }
              : null
          }
          myOffer={
            myOffer && {
              id: myOffer.id,
              price: myOffer.price,
              message: myOffer.message,
              status: myOffer.status,
              starsSpent: myOffer.starsSpent,
            }
          }
          offers={visibleOffers.map((o) => ({
            id: o.id,
            price: o.price,
            message: o.message,
            status: o.status,
            preparerId: o.preparerId,
            starsSpent: o.starsSpent,
            createdAt: o.createdAt.toISOString(),
            preparer: {
              name: o.preparer.name ?? o.preparer.login ?? "—",
              image: o.preparer.avatarUrl ?? o.preparer.image,
              login: o.preparer.login,
              about: o.preparer.about,
              rating: o.preparer.ratingCount
                ? o.preparer.ratingSum / o.preparer.ratingCount
                : null,
              ratingCount: o.preparer.ratingCount,
            },
          }))}
          queue={queue}
        />
      )}

      {isOrderer && !deleted && !locked && (
        <div className="flex justify-end border-t border-white/10 pt-4">
          <OrderDeleteButton orderId={order.id} />
        </div>
      )}
    </div>
  );
}

type Person = {
  id: string;
  name: string | null;
  login: string | null;
  avatarUrl: string | null;
  image: string | null;
  lastSeenAt: Date | null;
};

function PersonCard({ person, role }: { person: Person; role: string }) {
  const p = presenceText(person.lastSeenAt);
  const img = person.avatarUrl ?? person.image;
  return (
    <Link
      href={`/u/${person.id}`}
      className="card flex h-full items-center gap-3 p-3.5 transition hover:border-white/15 hover:bg-white/[0.06] sm:p-4"
    >
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {role}
        </span>
        <span className="block truncate font-medium text-white">
          {person.name ?? (person.login ? `@${person.login}` : role)}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
              p.online ? "bg-emerald-400" : "bg-zinc-600"
            }`}
          />
          <span className={`truncate ${p.online ? "text-emerald-400" : "text-zinc-500"}`}>
            {p.text}
          </span>
        </span>
      </span>
      <span aria-hidden className="shrink-0 text-lg text-zinc-600">›</span>
    </Link>
  );
}
