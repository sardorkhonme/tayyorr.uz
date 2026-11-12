/** Mobil ilova afzalliklari va «Yuklab oliş» tugmalari (plus/src/components/app-benefits.tsx bilan bir xil). */

const BENEFITS: { icon: keyof typeof ICONS; title: string; text: string }[] = [
  { icon: "grid", title: "Hammasi bitta ilovada", text: "Tayyorr.uz, tayyorr+ va Tayyorr SMM — bitta hisob bilan." },
  { icon: "bell", title: "Darhol bildirişnoma", text: "Buyurtma, taklif va xabarlar haqida — şu zahoti." },
  { icon: "chat", title: "Support bilan tezkor çat", text: "Savolingizni yozing — javob ilovaning özida." },
  { icon: "users", title: "Tayyorr’s Family", text: "Barça aʼzolar guruhi — faqat ilovada." },
  { icon: "wallet", title: "Bitta hamyon", text: "Barça xizmatlar uçun bitta balans." },
  { icon: "bolt", title: "Tez va qulay", text: "Tez oçiladi, har safar qayta kiriş şart emas." },
];

const ICONS = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0",
  chat: "M4 5h16v11H9l-5 4z",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.5A6.5 6.5 0 0 1 21.5 20",
  wallet: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13.5h2",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
} as const;

const ANDROID =
  "M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22A11.4 11.4 0 0 0 12 8.08c-1.77 0-3.43.38-4.92 1.06L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z";
const APPLE =
  "M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.66-.39 6.6 1.1 8.75.73 1.05 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.21z";

/** Ilova afzalliklari — ixcham ro'yxat (qorong'i fon uchun). */
export function AppBenefits() {
  return (
    <ul className="mx-auto mt-6 grid max-w-xl gap-x-5 gap-y-3 text-left sm:grid-cols-2 lg:mx-0">
      {BENEFITS.map((b) => (
        <li key={b.title} className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-indigo-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={ICONS[b.icon]} />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">{b.title}</span>
            <span className="block text-xs leading-relaxed text-zinc-400">{b.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** «Yuklab oliş» — Android (APK) va iOS (tez kunda) tugmalari, faqat belgi bilan. */
export function AppStoreButtons({ href }: { href: string }) {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
      <a
        href={href}
        aria-label="Android ilovasini yuklab oliş"
        className="inline-flex items-center gap-2.5 rounded-[0.9rem] bg-white px-6 py-3.5 font-semibold text-zinc-900 hover:bg-zinc-100"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#3DDC84]" fill="currentColor" aria-hidden>
          <path d={ANDROID} />
        </svg>
        Yuklab oliş
      </a>
      <span
        aria-disabled
        aria-label="iOS ilovasi — tez kunda"
        className="inline-flex cursor-default items-center gap-2.5 rounded-[0.9rem] border border-white/15 bg-white/[0.04] px-6 py-2.5 font-semibold text-zinc-500"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d={APPLE} />
        </svg>
        <span className="flex flex-col items-start leading-tight">
          Yuklab oliş
          <span className="text-[11px] font-medium text-zinc-500">Tez kunda</span>
        </span>
      </span>
    </div>
  );
}
