import { Icon } from "@/components/icons";
import { SMM_URL } from "@/lib/hub-nav";

export const metadata = { title: "Qöllanma" };

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz").replace(/\/+$/, "");

/** Qöllanma — platformalar röyxati; bosilganda şu platformaning qöllanmasi oçiladi. */
const PLATFORMS = [
  {
    href: `${APP_URL}/guide`,
    logo: "/logo-mark.png",
    title: "Tayyorr.uz",
    text: "Buyurtma beriş, tayyorlaş, takliflar va xabarlar",
  },
  {
    href: `${SMM_URL}/qollanma`,
    logo: "/smm-mark.png",
    title: "Tayyorr SMM",
    text: "Obunaçi, layk, körişlar — buyurtma berişdan natijagaça",
  },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-zinc-900">Qöllanma</h1>
        <p className="mt-2 text-zinc-500">Platformani tanlang — qanday işlaşini qadamma-qadam körsatamiz.</p>
      </header>
      <div className="space-y-3">
        {PLATFORMS.map((p) => (
          <a
            key={p.href}
            href={p.href}
            className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-zinc-100 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-zinc-900">{p.title}</span>
              <span className="mt-0.5 block text-sm text-zinc-500">{p.text}</span>
            </span>
            <Icon name="arrow-right" className="h-5 w-5 shrink-0 text-zinc-400" />
          </a>
        ))}
      </div>
    </div>
  );
}
