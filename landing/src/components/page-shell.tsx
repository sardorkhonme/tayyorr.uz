import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Ichki sahifalar (xizmatlar, oferta, maxfiylik) uchun umumiy ramka. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[30rem] w-[50rem] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-3xl" />
      <SiteHeader />
      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-32">{children}</div>
      <SiteFooter />
    </main>
  );
}
