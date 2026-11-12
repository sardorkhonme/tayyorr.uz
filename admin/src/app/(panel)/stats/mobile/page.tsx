import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import { shortDateTime } from "@/lib/date";
import { MOBILE_LISTS, loadMobileList, type MobileList } from "@/lib/mobile-stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mobil ilova — foydalanuvçilar" };

const METHOD: Record<string, string> = {
  GOOGLE: "Google (sayt)",
  GOOGLE_MOBILE: "Google (ilova)",
  EMAIL: "Email",
  EMAIL_MOBILE: "Email (ilova)",
};
const ROLE: Record<string, string> = { ORDERER: "Buyurtmaçi", PREPARER: "Tayyorlovçi" };

/** Mobil ilova foydalanuvchilari ro'yxatlari: ilovada yaratgan / saytdan yuklab olgan / saytdan ilovaga o'tgan. */
export default async function MobileUsersPage({ searchParams }: { searchParams: Promise<{ list?: string; page?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const list = (MOBILE_LISTS.find((l) => l.key === sp.list)?.key ?? "app") as MobileList;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim() || "";
  const data = await loadMobileList(list, page, q);
  const pages = Math.max(1, Math.ceil(data.total / data.size));
  const href = (p: Record<string, string | number>) => {
    const u = new URLSearchParams({ list, ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) });
    return `/stats/mobile?${u}`;
  };
  const current = MOBILE_LISTS.find((l) => l.key === list)!;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/app" className="text-sm text-zinc-500 hover:text-white">
          ← Mobil ilova
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-white">Mobil ilova — foydalanuvçilar</h1>
        <p className="mt-1 text-sm text-zinc-500">{current.hint}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MOBILE_LISTS.map((l) => (
          <Link
            key={l.key}
            href={`/stats/mobile?list=${l.key}`}
            className={`rounded-xl border px-3 py-2 text-sm ${l.key === list ? "border-violet-400/60 bg-violet-500/15 text-white" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"}`}
          >
            {l.label} <span className="ml-1 font-semibold">{data.counts[l.key].toLocaleString("ru-RU")}</span>
          </Link>
        ))}
      </div>

      <form className="flex gap-2" action="/stats/mobile">
        <input type="hidden" name="list" value={list} />
        <input name="q" defaultValue={q} className="input min-w-0 flex-1" placeholder="Qidiruv: login, email, ism" />
        <button className="btn-primary">Qidiriş</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">Foydalanuvçi</th>
              <th className="px-3 py-2.5 font-medium">Röyxatdan ötgan</th>
              <th className="px-3 py-2.5 font-medium">Yuklab olgan</th>
              <th className="px-3 py-2.5 font-medium">Ilovada birinçi</th>
              <th className="px-3 py-2.5 font-medium">Ilovada oxirgi</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-zinc-500">
                  Heç kim yöq
                </td>
              </tr>
            )}
            {data.rows.map((u) => {
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "—";
              return (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5">
                    <Link href={`/users/${u.id}`} className="text-white hover:underline">
                      {name}
                    </Link>
                    <div className="text-xs text-zinc-500">
                      {u.login ? `@${u.login}` : u.email ?? ""}
                      {u.role ? ` · ${ROLE[u.role] ?? u.role}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    {shortDateTime(u.createdAt)}
                    <div className="text-xs text-zinc-500">{u.signupMethod ? (METHOD[u.signupMethod] ?? u.signupMethod) : "—"}</div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{u.downloadedAt ? shortDateTime(u.downloadedAt) : "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    {u.mobileFirstAt ? shortDateTime(u.mobileFirstAt) : u.usedApp ? <span className="text-zinc-500">ilovada bör (sana yöq)</span> : <span className="text-zinc-600">hali kirmagan</span>}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{u.mobileLastAt ? shortDateTime(u.mobileLastAt) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={href({ page: page - 1 })} className="btn-ghost !px-3 !py-1.5">
              ‹ Oldingi
            </Link>
          )}
          <span className="text-zinc-500">
            {page} / {pages} · jami {data.total.toLocaleString("ru-RU")}
          </span>
          {page < pages && (
            <Link href={href({ page: page + 1 })} className="btn-ghost !px-3 !py-1.5">
              Keyingi ›
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
