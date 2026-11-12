import { AppBenefits, AppStoreButtons } from "@/components/app-benefits";
import { Icon } from "@/components/icons";

/** Android ilovasi (app.tayyorr.uz orqali R2 dagi APK). */
export const APP_DOWNLOAD_URL = `${(process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz").replace(/\/+$/, "")}/api/app/download`;

/** Telefonda tepada — ilovani yuklab olishga taklif; bosilganda pastdagi «Mobil ilova» bo'limiga silliq tushadi. */
export function AppDownloadBanner() {
  return (
    <a
      href="#ilova"
      className="animate-rise flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-fuchsia-50 px-4 py-3 text-zinc-900 lg:hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/plus-mark.png" alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white p-1 shadow-sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Tayyorr mobil ilovasini yuklab oling</span>
        <span className="block text-xs text-zinc-500">Barça xizmatlar — bitta ilovada</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white">
        <Icon name="download" className="h-3.5 w-3.5" />
        Yuklab oliş
      </span>
    </a>
  );
}

/** Landingdagi «Mobil ilova» bo'limi — tayyorr+ bosh sahifasining eng ostida. */
export function AppDownloadSection() {
  return (
    <section id="ilova" className="relative scroll-mt-24 pt-36 sm:pt-48 lg:pt-6">
      <div className="relative overflow-visible rounded-3xl bg-zinc-950 p-7 pt-32 text-white sm:p-10 sm:pt-44 lg:min-h-[20rem] lg:pt-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-violet-600/30 blur-3xl" />
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>
        <div className="pointer-events-none absolute -top-36 left-1/2 w-[19rem] max-w-[88vw] -translate-x-1/2 sm:-top-44 sm:w-[26rem] lg:left-auto lg:right-2 lg:top-1/2 lg:w-[28rem] lg:-translate-y-1/2 lg:translate-x-0">
          <div className="animate-float">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/app-phone.webp"
              alt="Tayyorr Android ilovasi"
              width={1100}
              height={943}
              loading="lazy"
              className="h-auto w-full drop-shadow-[0_30px_60px_rgba(124,58,237,0.35)]"
            />
          </div>
        </div>
        <div className="relative text-center lg:max-w-[55%] lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Mobil ilova</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Hammasi çöntagingizda</h2>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-zinc-400 lg:mx-0">
            tayyorr+, Tayyorr.uz va Tayyorr SMM — bitta ilovada. Buyurtmalar, xabarlar va hamyon; yangi xabar kelsa, darhol bilasiz.
          </p>
          <AppBenefits />
          <AppStoreButtons href={APP_DOWNLOAD_URL} />
        </div>
      </div>
    </section>
  );
}
