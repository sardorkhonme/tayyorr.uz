import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Logo } from "@/components/logo";
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
        <Link href="/" className="mb-8 flex justify-center">
          <Logo className="text-3xl" />
        </Link>

        <div className="card !p-6">
          <h1 className="font-display text-xl font-semibold text-white">Kirish</h1>
          <p className="mb-6 mt-2 text-sm leading-relaxed text-zinc-400">
            tayyorr.uz dagi login (yoki email) va parolingiz shu yerda ham ishlaydi — alohida ro&apos;yxatdan o&apos;tish shart emas.
          </p>
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
