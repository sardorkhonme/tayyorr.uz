import Link from "next/link";

import { Icon } from "@/components/icons";
import { som } from "@/lib/format";
import { PLUS_URL } from "@/lib/session";

export type HeaderUser = { name: string; image: string | null; balance: number } | null;

/** smm.tayyorr.uz sarlavhasi: logo, bo'limlar, balans va tayyorr+ ga qaytish. */
export function SmmHeader({ user }: { user: HeaderUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smm-mark.png" alt="" className="h-9 w-9 object-contain" />
          <span className="hidden font-display text-xl font-bold tracking-tight text-zinc-900 sm:inline">
            Tayyorr <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">SMM</span>
          </span>
        </Link>

        <nav className="ml-2 flex items-center gap-1 text-sm font-medium">
          <Link href="/" className="nav-item rounded-lg px-3 py-2 text-zinc-600">
            Xizmatlar
          </Link>
          {user && (
            <Link href="/orders" className="nav-item rounded-lg px-3 py-2 text-zinc-600">
              Buyurtmalarim
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <a
                href={`${PLUS_URL}/wallet`}
                className="hidden items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 sm:inline-flex"
                title="Hamyon (tayyorr+)"
              >
                <Icon name="wallet" className="h-4 w-4" />
                {som(user.balance)}
              </a>
              <a
                href={PLUS_URL}
                title="tayyorr+ ga qaytish"
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-zinc-700 transition hover:border-indigo-200"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/plus-mark.png" alt="" className="h-7 w-7 object-contain" />
                )}
                tayyorr+
              </a>
            </>
          ) : (
            <a href="/login" className="btn-primary !px-4 !py-2 !text-sm">
              Kirish
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
