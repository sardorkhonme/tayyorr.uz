import Link from "next/link";

import { loadLedger } from "@/lib/finance";
import type { Period } from "@/lib/stats";
import { fmtValue } from "@/components/admin/stats/format";
import { InfoTip } from "@/components/admin/stats/charts";
import { Icon } from "@/components/icons";

const KINDS = [
  { key: "all", label: "Hammasi" },
  { key: "wallet", label: "Hamyon amallari" },
  { key: "smmcloud", label: "smmcloud ga taşlaş" },
  { key: "withdraw", label: "Siz yeçib olgan" },
] as const;

const fmt = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "2-digit" });

/** Moliya pastidagi jadval: davr ichidagi barcha pul harakatlari, eng yangisi tepada. */
export async function FinanceLedger({ period, kind, limit, aiTip }: { period: Period; kind: string; limit: number; aiTip?: string }) {
  const k = KINDS.some((x) => x.key === kind) ? kind : "all";
  const { rows, users, total, more } = await loadLedger(period, k, limit);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const href = (patch: { t?: string; lim?: number }) => {
    const p = new URLSearchParams(period.query);
    const t = patch.t ?? k;
    if (t !== "all") p.set("t", t);
    const lim = patch.lim ?? 100;
    if (lim !== 100) p.set("lim", String(lim));
    return `/finance?${p.toString()}#jadval`;
  };

  return (
    <section id="jadval" className="viz-card relative min-w-0 scroll-mt-24 rounded-2xl p-4 sm:p-5">
      <InfoTip
        extra={aiTip}
        className="sm:!right-4 sm:!top-4"
        text={[
          "Tanlangan davrdagi barça pul harakatlari, eng yangisi tepada: foydalanuvçilar hamyonidagi har bir amal, smmcloud ga taşlangan pul va siz yeçib olgan pul.",
          "Summa: yaşil (+) — hisobga kirdi, qizil (−) — çiqdi. Hamyon amalini bosing — batafsil sahifasi oçiladi.",
          "«Bekor qilingan» amallar hisobga kirmaydi.",
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3 pr-8">
        <div>
          <h2 className="flex items-center gap-2 font-semibold" style={{ color: "var(--viz-text)" }}>
            <Icon name="file" className="h-4 w-4 shrink-0" style={{ color: "var(--viz-1)" }} />
            Barça hisob amallari
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--viz-muted)" }}>
            Şu davrda {total.toLocaleString("ru-RU")} ta amal
          </p>
        </div>
        <nav className="flex flex-wrap gap-1.5 text-xs">
          {KINDS.map((x) => (
            <Link
              key={x.key}
              href={href({ t: x.key, lim: 100 })}
              scroll={false}
              className="rounded-lg px-2.5 py-1.5 font-medium transition"
              style={x.key === k ? { background: "var(--viz-1)", color: "#fff" } : { color: "var(--viz-muted)", border: "1px solid var(--viz-grid)" }}
            >
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg px-3 py-6 text-center text-sm" style={{ background: "var(--viz-grid)", color: "var(--viz-muted)" }}>
          Bu davrda amal yöq
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: "var(--viz-muted)" }}>
                <th className="pb-2 pr-3 font-medium">Sana</th>
                <th className="pb-2 pr-3 font-medium">Amal</th>
                <th className="pb-2 pr-3 font-medium">Kim</th>
                <th className="pb-2 pr-3 font-medium">Usul</th>
                <th className="pb-2 pr-3 text-right font-medium">Summa</th>
                <th className="pb-2 font-medium">Izoh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const u = r.userId ? userMap.get(r.userId) : undefined;
                const who = r.kind !== "wallet" ? "Siz" : u?.isPlatform ? "Sayt hisobi" : u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || `@${u.login}` : "—";
                const cancelled = r.status === "Bekor qilingan";
                return (
                  <tr key={`${r.kind}-${r.id}`} className="border-t align-top" style={{ borderColor: "var(--viz-grid)", opacity: cancelled ? 0.5 : 1 }}>
                    <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-xs" style={{ color: "var(--viz-muted)" }}>
                      {r.kind === "wallet" ? fmt.format(r.at) : fmtDay.format(r.at)}
                    </td>
                    <td className="py-2.5 pr-3">
                      {r.href ? (
                        <Link href={r.href} className="hover:underline" style={{ color: "var(--viz-text)" }}>
                          {r.type}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--viz-text)" }}>{r.type}</span>
                      )}
                      {r.status && (
                        <span className="ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--viz-grid)", color: "var(--viz-muted)" }}>
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="max-w-[12rem] truncate py-2.5 pr-3">
                      {u && !u.isPlatform ? (
                        <Link href={`/users/${u.id}`} className="hover:underline" style={{ color: "var(--viz-text)" }}>
                          {who}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--viz-muted)" }}>{who}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-xs" style={{ color: "var(--viz-muted)" }}>
                      {r.method ?? "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap py-2.5 pr-3 text-right tabular-nums font-medium ${cancelled ? "line-through" : ""}`}
                      style={{ color: r.amount >= 0 ? "var(--viz-good)" : "var(--viz-bad)" }}
                    >
                      {r.amount >= 0 ? "+" : "−"}
                      {fmtValue(Math.abs(r.amount), "som")}
                    </td>
                    <td className="max-w-[18rem] py-2.5 text-xs" style={{ color: "var(--viz-muted)" }}>
                      <span className="line-clamp-2">{r.note ?? ""}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {more && (
        <div className="mt-4 text-center">
          <Link
            href={href({ lim: limit + 100 })}
            scroll={false}
            className="inline-block rounded-xl px-5 py-2.5 text-sm font-medium transition"
            style={{ border: "1px solid var(--viz-grid)", color: "var(--viz-text)" }}
          >
            Yana 100 ta körsatiş
          </Link>
        </div>
      )}
    </section>
  );
}
