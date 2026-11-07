import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { shortDateTime, shortDate } from "@/lib/date";
import { ageFrom, formatBirthday, googleBirthdayEnabled } from "@/lib/birthday";
import { HEAR_ABOUT_US_LABELS } from "@/components/hear-about-us-select";
import { Icon, StarIcon } from "@/components/icons";

export default async function AdminUserOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      referralLink: { select: { name: true, code: true } },
      referredBy: { select: { id: true, name: true, login: true } },
      _count: {
        select: {
          ordersCreated: true,
          ordersTaken: true,
          offers: true,
          complaintsMade: true,
          complaintsAgainst: true,
        },
      },
    },
  });
  if (!user || user.isSupport) notFound();

  const info: [string, React.ReactNode][] = [
    ["ID", user.id],
    ["Ism", `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—"],
    ["Login", user.login ?? "—"],
    ["Email", user.email ?? "—"],
    ["Rol", user.role ?? "—"],
    [
      "Tuğilgan sana (kiritgan)",
      user.birthDate
        ? `${formatBirthday(user.birthDate)} · ${ageFrom(user.birthDate)} yoş`
        : "kiritilmagan",
    ],
    [
      "Tuğilgan kun (Google)",
      user.googleBirthday
        ? formatBirthday(user.googleBirthday)
        : googleBirthdayEnabled()
          ? "Google bermadi (yaşirilgan yoki kiritilmagan)"
          : "olinmaydi (Google ruxsati hali yoqilmagan)",
    ],
    ["Hisob kodi", user.walletCode ?? "—"],
    ["Balans", formatSom(user.balance)],
    ["Star balansi", <>{user.starBalance} <StarIcon className="h-3.5 w-3.5" /></>],
    ["Röyxatdan", shortDateTime(user.createdAt)],
    [
      "Oferta",
      user.termsAcceptedAt
        ? `qabul qilingan · ${shortDate(user.termsAcceptedAt)}${user.termsVersion ? ` (v${user.termsVersion})` : ""}`
        : "qabul qilinmagan",
    ],
    [
      "Buyurtma/Taklif",
      `${user._count.ordersCreated} / ${user._count.ordersTaken} / ${user._count.offers}`,
    ],
    [
      "Şikoyatlar (yozgan / ustidan)",
      `${user._count.complaintsMade} / ${user._count.complaintsAgainst}`,
    ],
    [
      "Telegram bot",
      user.telegramChatId
        ? (
            <>
              <Icon name="check-circle" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px] text-emerald-400" />
              ulangan{user.telegramUsername ? ` (@${user.telegramUsername})` : ""}
            </>
          )
        : user.telegramBlockedAt
          ? (
              <>
                <Icon name="ban" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px] text-amber-400" />
                bloklagan · {shortDate(user.telegramBlockedAt)}
              </>
            )
          : "ulanmagan",
    ],
    [
      "Qayerdan eşitgan",
      user.hearAboutUs
        ? `${HEAR_ABOUT_US_LABELS[user.hearAboutUs] ?? user.hearAboutUs}${user.hearAboutUsDetail ? ` (${user.hearAboutUsDetail})` : ""}`
        : "körsatilmagan",
    ],
    [
      "Referral havola",
      user.referralLink
        ? `${user.referralLink.name} (${user.referralLink.code})`
        : "—",
    ],
    [
      "Kim taklif qilgan",
      user.referredBy
        ? `${user.referredBy.name ?? "—"} (@${user.referredBy.login ?? "—"})`
        : "—",
    ],
  ];

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">Hisob maʼlumotlari</h2>
        <Link href={`/logs?u=${user.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10">
          <Icon name="clock" className="h-3.5 w-3.5" />
          Barça izlari
        </Link>
      </div>
      <dl className="divide-y divide-white/5 text-sm">
        {info.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-zinc-500">{k}</dt>
            <dd className="text-right font-mono text-zinc-200">{v}</dd>
          </div>
        ))}
      </dl>
      {user.about && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-400">
          {user.about}
        </p>
      )}
    </section>
  );
}
