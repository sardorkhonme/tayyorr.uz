import { Logo } from "@/components/logo";
import { MAIN_URL } from "@/lib/format";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200/70 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-zinc-500 sm:flex-row sm:px-8">
        <div className="flex items-center gap-3">
          <Logo className="text-lg" />
          <span>— tayyorr.uz oilasi</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a href={MAIN_URL} className="hover:text-zinc-900">tayyorr.uz</a>
          <a href={`${MAIN_URL}/terms`} className="hover:text-zinc-900">Foydalanish shartlari</a>
          <a href={`${MAIN_URL}/privacy`} className="hover:text-zinc-900">Maxfiylik siyosati</a>
        </nav>
      </div>
    </footer>
  );
}
