import Link from "next/link";

import { signOut } from "@/auth";
import { Logo } from "@/components/logo";
import { TopupButton } from "@/components/topup-button";
import { som } from "@/lib/format";

type HeaderUser = {
  firstName: string | null;
  name: string | null;
  login: string | null;
  avatarUrl: string | null;
  image: string | null;
  balance: number;
} | null;

export function Header({ user }: { user: HeaderUser }) {
  const display = user?.firstName || user?.name || user?.login || "";
  const avatar = user?.avatarUrl || user?.image;

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#08080d]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5 sm:px-8">
        <Link href="/" aria-label="tayyorr+ bosh sahifa">
          <Logo className="text-2xl" />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 text-sm sm:flex">
          <Link href="/" className="rounded-lg px-3 py-1.5 text-zinc-300 hover:bg-white/5 hover:text-white">
            Xizmatlar
          </Link>
          {user && (
            <Link href="/orders" className="rounded-lg px-3 py-1.5 text-zinc-300 hover:bg-white/5 hover:text-white">
              Buyurtmalarim
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <TopupButton
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-3 pr-1.5 text-sm hover:bg-white/[0.08]"
                title="Hamyonni to'ldirish"
              >
                <span className="font-medium text-white">{som(user.balance)}</span>
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-500 text-base leading-none text-white">
                  +
                </span>
              </TopupButton>
              <Link href="/orders" className="sm:hidden btn-ghost !px-3 !py-1.5">
                Buyurtmalar
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-white/5"
                  title="Chiqish"
                >
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-sm">
                      {display.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden text-xs text-zinc-400 md:inline">Chiqish</span>
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-white !py-2">
              Kirish
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
