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
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
        <Link href="/" aria-label="tayyorr+ bosh sahifa">
          <Logo className="text-2xl" />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 text-[15px] md:flex">
          <Link href="/#start" className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
            Xizmatlar
          </Link>
          {user && (
            <Link href="/orders" className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
              Buyurtmalarim
            </Link>
          )}
          <Link href="/#faq" className="rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
            Savollar
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <TopupButton
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1.5 pl-4 pr-1.5 text-sm shadow-sm transition hover:border-zinc-300"
                title="Hamyonni to'ldirish"
              >
                <span className="font-semibold text-zinc-900">{som(user.balance)}</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-lg leading-none text-white">
                  +
                </span>
              </TopupButton>
              <Link href="/orders" className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 md:hidden">
                Buyurtmalar
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="group flex items-center gap-2 rounded-full p-0.5 hover:bg-zinc-100" title="Chiqish">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white" />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                      {display.slice(0, 1).toUpperCase() || "?"}
                    </span>
                  )}
                  <span className="hidden pr-2 text-sm text-zinc-500 group-hover:text-zinc-900 lg:inline">Chiqish</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-xl px-3 py-2 text-[15px] font-medium text-zinc-700 hover:bg-zinc-100">
                Kirish
              </Link>
              <Link href="/register" className="btn-primary !py-2.5">
                Ro&apos;yxatdan o&apos;tish
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
