"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { OrderDialog } from "@/components/order-dialog";
import { ServiceCard, type BoardService } from "@/components/service-card";
import { KINDS, kindOf, splitServiceName } from "@/lib/kinds";
import { PLATFORMS } from "@/lib/platforms";

const PAGE = 12;

/** Chegirmali xizmatlar ro'yxati: tarmoq bo'yicha filtr, karta bosilsa — buyurtma oynasi. */
export function DiscountsBoard({
  services,
  loggedIn,
  balance,
}: {
  services: BoardService[];
  loggedIn: boolean;
  balance: number;
}) {
  const items = useMemo(
    () =>
      services.map((s) => ({
        ...s,
        ...splitServiceName(s.name),
        label: `${PLATFORMS.find((p) => p.key === s.platform)?.name ?? "Boshqa"} · ${
          KINDS.find((k) => k.key === kindOf(s.category, s.name))?.label ?? ""
        }`,
      })),
    [services],
  );
  const platforms = PLATFORMS.filter((p) => items.some((s) => s.platform === p.key));

  const [platform, setPlatform] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<BoardService | null>(null);
  const [wallet, setWallet] = useState(balance);

  const list = platform ? items.filter((s) => s.platform === platform) : items;

  if (services.length === 0) {
    return (
      <section className="card !rounded-3xl px-6 py-16 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-500">
          <Icon name="tag" className="h-8 w-8" />
        </span>
        <p className="mt-4 font-display text-2xl font-bold text-zinc-900">Hozircha chegirmalar yo&apos;q</p>
        <p className="mx-auto mt-3 max-w-md text-zinc-500">
          Yangi chegirmalar tez-tez qo&apos;shiladi — kuzatib boring. Hozircha barcha xizmatlarni ko&apos;rishingiz mumkin.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Barcha xizmatlar
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {platforms.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[null, ...platforms.map((p) => p.key)].map((key) => {
            const active = platform === key;
            return (
              <button
                key={key ?? "all"}
                type="button"
                onClick={() => {
                  setPlatform(key);
                  setShown(PAGE);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                }`}
              >
                {key ? PLATFORMS.find((p) => p.key === key)?.name : "Hammasi"}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 pt-2 lg:grid-cols-2">
        {list.slice(0, shown).map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            title={s.title}
            tags={s.tags}
            label={s.label}
            onSelect={() => setSelected(s)}
          />
        ))}
      </div>
      {list.length > shown && (
        <div className="text-center">
          <button type="button" className="btn-ghost" onClick={() => setShown((v) => v + PAGE)}>
            Yana ko&apos;rsatish ({list.length - shown})
          </button>
        </div>
      )}

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
