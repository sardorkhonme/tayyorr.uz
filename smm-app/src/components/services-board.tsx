"use client";

import { useMemo, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { OrderDialog } from "@/components/order-dialog";
import { PlatformIcon } from "@/components/platform-icon";
import { DiscountBadge, ServiceCard, type BoardService } from "@/components/service-card";
import { KINDS, kindOf, splitServiceName } from "@/lib/kinds";
import { PLATFORMS } from "@/lib/platforms";

export type { BoardService };

const PAGE = 12;

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-display text-base font-bold text-white shadow-md shadow-indigo-500/30">
        {n}
      </span>
      <div>
        <h2 className="font-display text-2xl font-bold text-zinc-900 sm:text-3xl">{title}</h2>
        {hint && <p className="mt-1.5 text-zinc-500">{hint}</p>}
      </div>
    </div>
  );
}

export function ServicesBoard({
  services,
  loggedIn,
  balance,
  initialPlatform = null,
  initialKind = null,
}: {
  services: BoardService[];
  loggedIn: boolean;
  balance: number;
  /** havoladan oldindan tanlash: ?p=instagram&k=followers */
  initialPlatform?: string | null;
  initialKind?: string | null;
}) {
  const withKind = useMemo(
    () => services.map((s) => ({ ...s, kind: kindOf(s.category, s.name), ...splitServiceName(s.name) })),
    [services],
  );

  const platformCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of withKind) m.set(s.platform, (m.get(s.platform) ?? 0) + 1);
    return m;
  }, [withKind]);

  // eng katta chegirma: "platforma" va "platforma:tur" bo'yicha (yorliqlar uchun)
  const maxDiscount = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of withKind) {
      if (!s.discount) continue;
      for (const key of [s.platform, `${s.platform}:${s.kind}`]) m.set(key, Math.max(m.get(key) ?? 0, s.discount));
    }
    return m;
  }, [withKind]);

  const [platform, setPlatform] = useState<string | null>(initialPlatform);
  const [kind, setKind] = useState<string | null>(initialPlatform ? initialKind : null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<BoardService | null>(null);
  const [wallet, setWallet] = useState(balance);

  const step2 = useRef<HTMLDivElement>(null);
  const step3 = useRef<HTMLDivElement>(null);
  const scrollTo = (el: HTMLDivElement | null) =>
    setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  const platforms = PLATFORMS.filter((p) => p.key !== "other" || platformCounts.get("other"));

  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of withKind) if (s.platform === platform) m.set(s.kind, (m.get(s.kind) ?? 0) + 1);
    return KINDS.filter((k) => m.get(k.key)).map((k) => ({ ...k, count: m.get(k.key)! }));
  }, [withKind, platform]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withKind
      .filter((s) => s.platform === platform && s.kind === kind)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .sort((a, b) => a.rate - b.rate);
  }, [withKind, platform, kind, query]);

  const platformName = PLATFORMS.find((p) => p.key === platform)?.name;
  const kindLabel = KINDS.find((k) => k.key === kind)?.label;

  if (services.length === 0) {
    return (
      <section id="start" className="card scroll-mt-24 !rounded-3xl px-6 py-16 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
          <Icon name="clock" className="h-8 w-8" />
        </span>
        <p className="mt-4 font-display text-2xl font-bold text-zinc-900">Xizmatlar tez orada qo&apos;shiladi</p>
        <p className="mx-auto mt-3 max-w-md text-zinc-500">
          Hozir ro&apos;yxatni tayyorlayapmiz. Bir oz vaqtdan keyin qaytib keling.
        </p>
      </section>
    );
  }

  return (
    <section id="start" className="scroll-mt-24 space-y-20">
      {/* 1-qadam: tarmoq */}
      <div className="space-y-8">
        <StepTitle n={1} title="Ijtimoiy tarmoqni tanlang" hint="Qaysi tarmoqdagi sahifangizni o'stirmoqchisiz?" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {platforms.map((p) => {
            const n = platformCounts.get(p.key) ?? 0;
            const active = platform === p.key;
            return (
              <button
                key={p.key}
                type="button"
                disabled={!n}
                onClick={() => {
                  setPlatform(p.key);
                  setKind(null);
                  setQuery("");
                  setShown(PAGE);
                  scrollTo(step2.current);
                }}
                data-active={active}
                style={{ "--from": p.from, "--glow": p.from } as React.CSSProperties}
                className="platform-tile glow-card card relative flex flex-col items-start gap-4 !rounded-2xl p-5 text-left disabled:cursor-not-allowed disabled:opacity-50 sm:p-6"
              >
                {maxDiscount.get(p.key) ? (
                  <DiscountBadge pct={maxDiscount.get(p.key)!} className="absolute right-3 top-3" />
                ) : null}
                <span
                  className="shine grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg"
                  style={
                    {
                      background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
                      "--shine-delay": `${(PLATFORMS.indexOf(p) * 0.35).toFixed(2)}s`,
                    } as React.CSSProperties
                  }
                >
                  <PlatformIcon platform={p.key} className="h-7 w-7" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-semibold text-zinc-900">{p.name}</span>
                  <span className="text-sm text-zinc-500">{n ? `${n} ta xizmat` : "Tez orada"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-qadam: nima kerak */}
      <div ref={step2} className="scroll-mt-24">
        {platform && (
          <div className="animate-rise space-y-8">
            <StepTitle n={2} title="Nima kerak?" hint={`${platformName} uchun xizmat turini tanlang`} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kinds.map((k) => {
                const active = kind === k.key;
                return (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => {
                      setKind(k.key);
                      setQuery("");
                      setShown(PAGE);
                      scrollTo(step3.current);
                    }}
                    style={{ "--glow": k.color } as React.CSSProperties}
                    className={`glow-card rounded-2xl border bg-white p-5 text-left shadow-sm ${
                      active ? "border-indigo-500 ring-4 ring-indigo-100" : "border-zinc-200/80"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                        style={{ background: `${k.color}14`, color: k.color }}
                      >
                        <Icon name={k.icon} className="h-[22px] w-[22px]" />
                      </span>
                      <span className="flex-1 font-display text-lg font-semibold text-zinc-900">{k.label}</span>
                      {maxDiscount.get(`${platform}:${k.key}`) ? (
                        <DiscountBadge pct={maxDiscount.get(`${platform}:${k.key}`)!} />
                      ) : null}
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">{k.count}</span>
                    </span>
                    <span className="mt-3 block text-sm text-zinc-500">{k.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3-qadam: xizmat */}
      <div ref={step3} className="scroll-mt-24">
        {platform && kind && (
          <div className="animate-rise space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <StepTitle n={3} title="Xizmatni tanlang" hint={`${platformName} · ${kindLabel} — eng arzonidan boshlab`} />
              <input
                className="input sm:max-w-xs"
                placeholder="Ro'yxatdan qidirish…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
              />
            </div>

            {list.length === 0 ? (
              <p className="card px-6 py-10 text-center text-zinc-500">
                Hech narsa topilmadi
              </p>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  {list.slice(0, shown).map((s) => (
                    <ServiceCard key={s.id} service={s} title={s.title} tags={s.tags} onSelect={() => setSelected(s)} />
                  ))}
                </div>
                {list.length > shown && (
                  <div className="text-center">
                    <button type="button" className="btn-ghost" onClick={() => setShown((v) => v + PAGE)}>
                      Yana ko&apos;rsatish ({list.length - shown})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {selected && (
        <OrderDialog
          service={selected}
          loggedIn={loggedIn}
          balance={wallet}
          onClose={() => setSelected(null)}
          onOrdered={setWallet}
        />
      )}
    </section>
  );
}
