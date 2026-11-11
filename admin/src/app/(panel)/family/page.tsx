import Link from "next/link";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { shortDateTime } from "@/lib/date";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";
import { FamilyAdmins } from "@/components/admin/family-admins";
import { FamilyRefresh } from "@/components/admin/family-refresh";

export const dynamic = "force-dynamic";

const PAGE = 100;
const userSelect = { id: true, name: true, firstName: true, lastName: true, login: true, avatarUrl: true, image: true } as const;

type U = { name: string | null; firstName: string | null; lastName: string | null; login: string | null };
const nameOf = (u: U) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || (u.login ? `@${u.login}` : "Foydalanuvçi");
const AS_LABEL: Record<string, string> = { brand: "Tayyorr.uz", support: "Tayyorr Support" };

/**
 * «Tayyorr's Family» — ilovadagi guruhning to'liq tarixi: o'chirilganlari ham, fayllar doimiy
 * (shikoyatlarni ko'rib chiqish uchun). Real vaqt yo'q — «Yangilash» bosilganda yangilanadi.
 */
export default async function AdminFamily({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  await requireAdmin();
  const { before } = await searchParams;
  const beforeDate = before && Number(before) ? new Date(Number(before)) : null;

  const [rows, members, total, today, admins] = await Promise.all([
    db.familyMessage.findMany({
      where: beforeDate ? { sendAt: { lt: beforeDate } } : {},
      orderBy: { sendAt: "desc" },
      take: PAGE + 1,
      include: { sender: { select: userSelect }, replyTo: { select: { id: true, body: true, fileName: true, as: true, sender: { select: userSelect } } } },
    }),
    db.familyMember.count(),
    db.familyMessage.count(),
    db.familyMessage.count({ where: { sendAt: { gte: new Date(Date.now() - 24 * 3600 * 1000), lte: new Date() } } }),
    db.user.findMany({ where: { familyAdmin: true }, select: userSelect, orderBy: { login: "asc" } }),
  ]);
  const hasMore = rows.length > PAGE;
  const list = rows.slice(0, PAGE);

  // o'chirganlar va belgilanganlar nomlari
  const extraIds = [...new Set(list.flatMap((m) => [m.deletedById, ...m.mentions]).filter((x): x is string => !!x && x !== "brand" && x !== "support"))];
  const extra = new Map(
    (extraIds.length ? await db.user.findMany({ where: { id: { in: extraIds } }, select: userSelect }) : []).map((u) => [u.id, u]),
  );

  const items = await Promise.all(
    list.map(async (m) => ({
      m,
      url: m.fileKey ? await presignGet({ bucket: PRIVATE_BUCKET, key: m.fileKey, expiresIn: 3600 }) : null,
    })),
  );
  const now = Date.now();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Tayyorr&apos;s Family</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Faqat mobil ilovadagi guruh. Bu yerda barça xabarlar saqlanadi — öçirilganlari ham, fayllar doimiy (ilovada fayl 5 kun oçiladi).
          </p>
        </div>
        <FamilyRefresh />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Aʼzolar", value: members },
          { label: "Jami xabarlar", value: total },
          { label: "Söngi 24 soat", value: today },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="text-sm text-zinc-400">{s.label}</span>
            <p className="mt-1 text-2xl font-semibold text-white">{s.value.toLocaleString("ru-RU")}</p>
          </div>
        ))}
      </div>

      <FamilyAdmins admins={admins.map((a) => ({ id: a.id, name: nameOf(a), login: a.login, image: a.avatarUrl ?? a.image ?? null }))} />

      <div className="flex flex-col gap-2">
        {items.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Hali xabar yöq.</p>}
        {items.map(({ m, url }) => {
          const asLabel = AS_LABEL[m.as];
          const future = m.sendAt.getTime() > now;
          const isImage = (m.fileType ?? "").startsWith("image/");
          const deletedBy = m.deletedById ? extra.get(m.deletedById) : null;
          return (
            <div
              key={m.id}
              id={m.id}
              className={`scroll-mt-24 rounded-2xl border p-4 ${m.deletedAt ? "border-red-500/25 bg-red-500/[0.04]" : "border-white/10 bg-white/[0.03]"}`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold text-white">{asLabel ?? nameOf(m.sender)}</span>
                {asLabel && (
                  <span className="text-xs text-zinc-500">
                    (yozgan: {nameOf(m.sender)}
                    {m.sender.login ? ` @${m.sender.login}` : ""})
                  </span>
                )}
                {!asLabel && m.sender.login && <span className="text-xs text-zinc-500">@{m.sender.login}</span>}
                <span className="ml-auto text-xs text-zinc-500">{shortDateTime(m.sendAt)}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                {m.pinnedAt && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">Qadalgan</span>}
                {m.notifyAll && <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-violet-300">Hammaga bildirilgan</span>}
                {m.scheduled && (
                  <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-sky-300">
                    {future ? "Rejalaştirilgan — hali yuborilmagan" : "Rejalaştirilgan"} · yozilgan {shortDateTime(m.createdAt)}
                  </span>
                )}
                {m.deletedAt && (
                  <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-red-300">
                    Öçirilgan {shortDateTime(m.deletedAt)}
                    {deletedBy ? ` · ${deletedBy.id === m.senderId ? "özi" : nameOf(deletedBy)}` : ""}
                  </span>
                )}
                {m.mentions.length > 0 && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-400">
                    Belgilangan:{" "}
                    {m.mentions
                      .map((id) => (id === "brand" ? "Tayyorr.uz" : id === "support" ? "Support" : extra.get(id)?.login ? `@${extra.get(id)!.login}` : "?"))
                      .join(", ")}
                  </span>
                )}
              </div>
              {m.replyTo && (
                <a href={`#${m.replyTo.id}`} className="mt-2 block border-l-2 border-violet-400/50 pl-2 text-xs text-zinc-400 hover:text-zinc-300">
                  ↩ {AS_LABEL[m.replyTo.as] ?? nameOf(m.replyTo.sender)}: {(m.replyTo.body || (m.replyTo.fileName ? `📎 ${m.replyTo.fileName}` : "")).slice(0, 120)}
                </a>
              )}
              {m.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-200">{m.body}</p>}
              {url && (
                <div className="mt-2">
                  {isImage ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={m.fileName ?? ""} className="max-h-60 rounded-xl border border-white/10 object-contain" />
                    </a>
                  ) : (
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-violet-300 hover:bg-white/10">
                      📎 {m.fileName ?? "fayl"}
                      {m.fileSize ? <span className="text-xs text-zinc-500">{(m.fileSize / 1024 / 1024).toFixed(1)} MB</span> : null}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <Link href={`/family?before=${list[list.length - 1].sendAt.getTime()}`} className="btn-ghost self-center">
          Eskiroq xabarlar ›
        </Link>
      )}
    </div>
  );
}
