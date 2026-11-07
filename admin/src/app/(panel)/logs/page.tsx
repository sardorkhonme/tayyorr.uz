import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { activityLabel } from "@/lib/activity-labels";
import { describeDevice } from "@/lib/user-agent";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Loglar" };

/**
 * Loglar — saytdagi har bir iz (AuditLog: sahifa ochish va amallar; foydalanuvchi, admin, mehmon)
 * va muhim amallar (ActivityLog: kirish, buyurtma, taklif, shartnoma ...). Doimiy saqlanadi.
 */
const PAGE = 100;

const ACTOR: Record<string, { label: string; cls: string }> = {
  USER: { label: "Foydalanuvçi", cls: "bg-indigo-500/15 text-indigo-300" },
  ADMIN: { label: "Admin", cls: "bg-amber-500/15 text-amber-300" },
  GUEST: { label: "Mehmon", cls: "bg-zinc-500/15 text-zinc-300" },
};
const SITE: Record<string, string> = { app: "Tayyorr.uz", plus: "tayyorr+", smm: "SMM", admin: "Admin panel" };

const fmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type SP = { tab?: string; actor?: string; site?: string; kind?: string; u?: string; q?: string; before?: string };

function href(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/logs${s ? `?${s}` : ""}`;
}

type U = { id: string; name: string | null; firstName: string | null; lastName: string | null; login: string | null; avatarUrl: string | null; image: string | null };
const nameOf = (u: U) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || (u.login ? `@${u.login}` : u.id.slice(0, 8));

function Who({ u, id, actor, sp }: { u?: U; id: string | null; actor: string; sp: SP }) {
  if (actor === "ADMIN") return <span className="font-medium text-amber-300">Admin</span>;
  if (!id) return <span className="text-zinc-500">Mehmon</span>;
  const src = u?.avatarUrl || u?.image;
  return (
    <Link href={href(sp, { u: id, before: undefined })} className="flex min-w-0 items-center gap-2 hover:underline" title="Faqat şu odamning izlari">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-zinc-400">
          <Icon name="user" className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="truncate text-zinc-100">{u ? nameOf(u) : id.slice(0, 10)}</span>
    </Link>
  );
}

export default async function LogsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "amal" ? "amal" : "iz";
  const q = (sp.q ?? "").trim().slice(0, 100);
  const before = sp.before && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : null;
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);

  // filtrdagi foydalanuvchi
  const filterUser = sp.u
    ? await db.user.findUnique({ where: { id: sp.u }, select: { id: true, name: true, firstName: true, lastName: true, login: true, avatarUrl: true, image: true } })
    : null;

  let tableMissing = false;
  let rows: { id: string; at: Date; actor: string; userId: string | null; site: string; kind: string; summary: string; path: string; method: string; ip: string | null; ua: string | null; place: string | null }[] = [];
  let stats = { total: 0, users: 0, admin: 0 };

  if (tab === "iz") {
    const where: Prisma.AuditLogWhereInput = {
      ...(sp.actor && ACTOR[sp.actor] ? { actor: sp.actor } : {}),
      ...(sp.site && SITE[sp.site] ? { site: sp.site } : {}),
      ...(sp.kind === "PAGE" || sp.kind === "ACTION" ? { kind: sp.kind } : {}),
      ...(sp.u ? { userId: sp.u } : {}),
      ...(q ? { OR: [{ summary: { contains: q, mode: "insensitive" } }, { path: { contains: q, mode: "insensitive" } }, { ip: { contains: q } }] } : {}),
      ...(before ? { createdAt: { lt: before } } : {}),
    };
    try {
      const [list, total, users, admin] = await Promise.all([
        db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE }),
        db.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
        db.auditLog.findMany({ where: { createdAt: { gte: dayAgo }, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
        db.auditLog.count({ where: { createdAt: { gte: dayAgo }, actor: "ADMIN" } }),
      ]);
      rows = list.map((r) => ({
        id: r.id,
        at: r.createdAt,
        actor: r.actor,
        userId: r.userId,
        site: r.site,
        kind: r.kind,
        summary: r.summary,
        path: r.path,
        method: r.method,
        ip: r.ip,
        ua: r.userAgent,
        place: [r.city, r.country].filter(Boolean).join(", ") || null,
      }));
      stats = { total, users: users.length, admin };
    } catch {
      // AuditLog jadvali hali bazada yo'q (prisma db push qilinmagan)
      tableMissing = true;
    }
  } else {
    const where: Prisma.ActivityLogWhereInput = {
      ...(sp.u ? { userId: sp.u } : {}),
      ...(q ? { OR: [{ summary: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }] } : {}),
      ...(before ? { createdAt: { lt: before } } : {}),
    };
    const list = await db.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE });
    rows = list.map((r) => ({
      id: r.id,
      at: r.createdAt,
      actor: "USER",
      userId: r.userId,
      site: "",
      kind: "ACTION",
      summary: `${activityLabel(r.action)}${r.summary && r.summary !== activityLabel(r.action) ? ` — ${r.summary}` : ""}`,
      path: r.action,
      method: "",
      ip: r.ip,
      ua: r.userAgent,
      place: null,
    }));
  }

  const ids = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
  const users = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, firstName: true, lastName: true, login: true, avatarUrl: true, image: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const last = rows[rows.length - 1];

  const chip = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-indigo-500 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Loglar</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Saytdagi har bir iz doimiy saqlanadi: kim, qaçon, qaysi saytda, nima qildi. Forma maʼlumotlari va parollar yozilmaydi. Vaqt — Toşkent.
        </p>
      </div>

      {/* tablar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <Link href={href({ u: sp.u }, { tab: undefined })} className={chip(tab === "iz")}>
            Barça izlar
          </Link>
          <Link href={href({ u: sp.u }, { tab: "amal" })} className={chip(tab === "amal")}>
            Muhim amallar
          </Link>
        </div>
        {filterUser && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-200">
            Faqat: <b>{nameOf(filterUser)}</b>
            <Link href={`/users/${filterUser.id}`} className="text-xs text-indigo-300 underline">
              profil
            </Link>
            <Link href={href(sp, { u: undefined, before: undefined })} aria-label="Filtrni olib taşlaş" className="text-indigo-300 hover:text-white">
              <Icon name="close" className="h-4 w-4" />
            </Link>
          </span>
        )}
      </div>

      {tab === "iz" && !tableMissing && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "24 soatda izlar", value: stats.total },
            { label: "24 soatda faol foydalanuvçilar", value: stats.users },
            { label: "24 soatda admin amallari", value: stats.admin },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-2xl font-semibold tabular-nums text-white">{s.value.toLocaleString("ru-RU")}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* filtrlar */}
      <form action="/logs" className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {tab === "amal" && <input type="hidden" name="tab" value="amal" />}
        {sp.u && <input type="hidden" name="u" value={sp.u} />}
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-500">
          Qidiriş
          <input
            name="q"
            defaultValue={q}
            placeholder="amal, sahifa, IP…"
            className="input rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
          />
        </label>
        {tab === "iz" && (
          <>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Kim
              <select name="actor" defaultValue={sp.actor ?? ""} className="input rounded-lg border border-white/10 bg-[#14141b] px-3 py-2 text-sm text-white">
                <option value="">Hammasi</option>
                <option value="USER">Foydalanuvçilar</option>
                <option value="ADMIN">Admin</option>
                <option value="GUEST">Mehmonlar</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Sayt
              <select name="site" defaultValue={sp.site ?? ""} className="input rounded-lg border border-white/10 bg-[#14141b] px-3 py-2 text-sm text-white">
                <option value="">Hammasi</option>
                {Object.entries(SITE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Turi
              <select name="kind" defaultValue={sp.kind ?? ""} className="input rounded-lg border border-white/10 bg-[#14141b] px-3 py-2 text-sm text-white">
                <option value="">Hammasi</option>
                <option value="ACTION">Amallar</option>
                <option value="PAGE">Sahifa oçiş</option>
              </select>
            </label>
          </>
        )}
        <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400">Körsatiş</button>
        {(q || sp.actor || sp.site || sp.kind) && (
          <Link href={href({ tab: sp.tab, u: sp.u }, {})} className="px-2 py-2 text-sm text-zinc-400 hover:text-white">
            Tozalaş
          </Link>
        )}
      </form>

      {tableMissing ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">
          Loglar jadvali hali bazada yaratilmagan. Loyiha ildizida <code className="rounded bg-black/30 px-1.5 py-0.5">npx prisma db push</code> buyrugʻini bir marta
          işga tuşiring — şundan keyin izlar yozila boşlaydi.
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-500">Hozirça iz yöq</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <ul className="divide-y divide-white/5">
            {rows.map((r) => {
              const a = ACTOR[r.actor] ?? ACTOR.GUEST;
              const device = describeDevice(r.ua);
              return (
                <li key={r.id} className="grid gap-x-4 gap-y-1 px-4 py-3 text-sm md:grid-cols-[9.5rem_minmax(0,11rem)_minmax(0,1fr)_minmax(0,12rem)]">
                  <span className="tabular-nums text-xs text-zinc-500 md:pt-0.5">{fmt.format(r.at)}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <Who u={r.userId ? userMap.get(r.userId) : undefined} id={r.userId} actor={r.actor} sp={sp} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {tab === "iz" && <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${a.cls}`}>{SITE[r.site] ?? r.site}</span>}
                      <span className={r.kind === "ACTION" ? "font-medium text-zinc-100" : "text-zinc-300"}>{r.summary}</span>
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-600">
                      {r.method && `${r.method} `}
                      {r.path}
                    </span>
                  </span>
                  <span className="min-w-0 text-xs text-zinc-500">
                    {device && <span className="block truncate">{device}</span>}
                    {(r.ip || r.place) && (
                      <span className="block truncate">
                        {r.ip}
                        {r.place && ` · ${r.place}`}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {rows.length === PAGE && last && (
        <Link
          href={href(sp, { before: last.at.toISOString() })}
          className="self-center rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
        >
          Oldingi {PAGE} ta →
        </Link>
      )}
      {before && (
        <Link href={href(sp, { before: undefined })} className="self-center text-sm text-zinc-500 hover:text-zinc-200">
          ← Eng yangilariga qaytiş
        </Link>
      )}
    </div>
  );
}
