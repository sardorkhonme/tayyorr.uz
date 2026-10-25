import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { shortDateTime, shortDate } from "@/lib/date";
import { ageFrom, formatBirthday, googleBirthdayEnabled } from "@/lib/birthday";
import { HEAR_ABOUT_US_LABELS } from "@/components/hear-about-us-select";

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

  const info: [string, string][] = [
    ["ID", user.id],
    ["Ism", `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—"],
    ["Login", user.login ?? "—"],
    ["Email", user.email ?? "—"],
    ["Rol", user.role ?? "—"],
    [
      "Tug'ilgan sana (kiritgan)",
      user.birthDate
        ? `${formatBirthday(user.birthDate)} · ${ageFrom(user.birthDate)} yosh`
        : "kiritilmagan",
    ],
    [
      "Tug'ilgan kun (Google)",
      user.googleBirthday
        ? formatBirthday(user.googleBirthday)
        : googleBirthdayEnabled()
          ? "Google bermadi (yashirilgan yoki kiritilmagan)"
          : "olinmaydi (Google ruxsati hali yoqilmagan)",
    ],
    ["Hisob kodi", user.walletCode ?? "—"],
    ["Balans", formatSom(user.balance)],
    ["Star balansi", `${user.starBalance} ⭐`],
    ["Ro'yxatdan", shortDateTime(user.createdAt)],
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
      "Shikoyatlar (yozgan / ustidan)",
      `${user._count.complaintsMade} / ${user._count.complaintsAgainst}`,
    ],
    [
      "Telegram bot",
      user.telegramChatId
        ? `✅ ulangan${user.telegramUsername ? ` (@${user.telegramUsername})` : ""}`
        : user.telegramBlockedAt
          ? `🚫 bloklagan · ${shortDate(user.telegramBlockedAt)}`
          : "ulanmagan",
    ],
    [
      "Qayerdan eshitgan",
      user.hearAboutUs
        ? `${HEAR_ABOUT_US_LABELS[user.hearAboutUs] ?? user.hearAboutUs}${user.hearAboutUsDetail ? ` (${user.hearAboutUsDetail})` : ""}`
        : "ko'rsatilmagan",
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
      <h2 className="mb-3 font-semibold text-white">Hisob ma'lumotlari</h2>
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
