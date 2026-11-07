import { currentUser } from "@/lib/session";
import { GuideBanner } from "@/components/guide-banner";
import { loadCatalog } from "@/lib/catalog";
import { DiscountsBoard } from "@/components/discounts-board";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Çegirmalar — Tayyorr SMM" };

export default async function DiscountsPage() {
  const [user, services] = await Promise.all([currentUser(), loadCatalog()]);
  const sale = services.filter((s) => s.discount > 0).sort((a, b) => b.discount - a.discount || a.rate - b.rate);

  return (
    <div className="space-y-10">
      <header className="animate-rise flex items-center gap-4">
        <span className="shine grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white shadow-lg shadow-rose-500/30">
          <Icon name="tag" className="h-7 w-7" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900">Çegirmalar</h1>
          <p className="mt-1 text-zinc-500">Arzonlaşgan xizmatlar — eng katta çegirmadan boşlab.</p>
        </div>
      </header>

      <GuideBanner />

      <DiscountsBoard services={sale} loggedIn={!!user} balance={user?.balance ?? 0} />
    </div>
  );
}
