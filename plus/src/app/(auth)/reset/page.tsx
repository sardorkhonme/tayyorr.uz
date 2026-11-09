import Link from "next/link";

import { isResetTokenValid } from "@/lib/password-reset";

import { ResetForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "Yangi parol" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const valid = await isResetTokenValid(token);
  return (
    <AuthShell mode="none">
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold text-zinc-900">Havola eskirgan</h1>
          <p className="mb-6 mt-1.5 text-zinc-500">
            Bu havola muddati tugagan yoki allaqaçon işlatilgan. Yangi havola sörang.
          </p>
          <Link href="/forgot" className="btn-primary w-full !py-4 !text-base">
            Yangi havola söraş
          </Link>
        </>
      )}
    </AuthShell>
  );
}
