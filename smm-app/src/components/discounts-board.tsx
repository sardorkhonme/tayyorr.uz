"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { OrderDialog } from "@/components/order-dialog";
import { ServiceCard, type BoardService } from "@/components/service-card";
import { KINDS, kindOf, splitServiceName } from "@/lib/kinds";
import { PLATFORMS } from "@/lib/platforms";
import { MascotState } from "@/components/mascot";

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
        label: `${PLATFORMS.find((p) => p.key === s.platform)?.name ?? "Boşqa"} · ${
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
      <section className="text-zinc-900">
        <MascotState
          pose="empty-discounts"
          size={240}
          className="mascot-page"
          title="Hozirça çegirmalar yöq"
          message="Yangi çegirmalar tez-tez qöşiladi — kuzatib boring. Hozirça barça xizmatlarni körişingiz mumkin."
        >
          <Link href="/" className="btn-primary">
            Barça xizmatlar
          </Link>
        </MascotState>
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
            Yana körsatiş ({list.length - shown})
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
