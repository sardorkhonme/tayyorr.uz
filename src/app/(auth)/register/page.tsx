"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { AuthShell } from "@/components/auth-shell";
import { TermsGate } from "@/components/terms-gate";

type Role = "ORDERER" | "PREPARER";

const ROLES: { id: Role; title: string; desc: string }[] = [
  { id: "ORDERER", title: "Buyurtma beruvchi", desc: "Ish buyuraman" },
  { id: "PREPARER", title: "Tayyorlovchi", desc: "Ish tayyorlab beraman" },
];

export default function RegisterPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell>
      <div className="card p-7">
        <h1 className="text-xl font-semibold text-white">Ro'yxatdan o'tish</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Rolni tanlang, Google bilan davom eting. Keyingi qadamda ism, familiya,
          login, parol va rasm so'raladi.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {ROLES.map((r) => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-indigo-400/70 bg-indigo-500/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{r.title}</span>
                  <span
                    className={`h-4 w-4 rounded-full border ${
                      active
                        ? "border-indigo-400 bg-indigo-400"
                        : "border-white/25"
                    }`}
                  />
                </div>
                <div className="mt-1 text-xs text-zinc-500">{r.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <TermsGate checked={agree} onChange={setAgree} />
        </div>

        <button
          type="button"
          className="btn-white mt-4 w-full"
          disabled={!role || !agree || busy}
          onClick={() => {
            setBusy(true);
            signIn("google", { callbackUrl: `/onboarding?role=${role}` });
          }}
        >
          {!role
            ? "Avval rolni tanlang"
            : !agree
              ? "Shartlarga rozilik bering"
              : "Google bilan davom etish"}
        </button>
      </div>

      <p className="mt-5 text-center text-sm text-zinc-500">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
          Kirish
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-zinc-600">
        <Link href="/terms" className="hover:text-zinc-400">
          Ommaviy oferta va foydalanish shartlari
        </Link>
      </p>
    </AuthShell>
  );
}
