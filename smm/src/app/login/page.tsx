import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MAIN_URL } from "@/lib/format";

import { LoginForm } from "./login-form";

export const metadata = { title: "Kirish" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if ((await auth())?.user?.id) redirect("/");
  const { error } = await searchParams;
  const initialError =
    error === "no_account"
      ? "Bu Google hisobi tayyorr.uz da ro'yxatdan o'tmagan. Avval tayyorr.uz da ro'yxatdan o'ting."
      : error
        ? "Kirishda xatolik yuz berdi, qayta urinib ko'ring"
        : undefined;

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-grid" />
      <div className="pointer-events-none absolute left-1/2 top-[-160px] -z-10 h-[380px] w-[620px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />

      <div className="w-full max-w-sm animate-rise">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="tayyorr" className="h-7 w-auto" />
          <span className="rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-1.5 py-0.5 font-display text-xs font-bold tracking-wider text-white">
            SMM
          </span>
        </Link>

        <div className="card !p-6">
          <h1 className="font-display text-xl font-semibold text-white">Kirish</h1>
          <p className="mb-5 mt-1 text-sm text-zinc-400">tayyorr.uz login/email va parolingiz bilan kiring.</p>
          <LoginForm initialError={initialError} />
        </div>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Hisobingiz yo'qmi?{" "}
          <a href={`${MAIN_URL}/register?from=smm`} className="text-indigo-300 hover:underline">
            tayyorr.uz da ro'yxatdan o'ting
          </a>
        </p>
      </div>
    </main>
  );
}
