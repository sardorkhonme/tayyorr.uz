"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { AvatarUpload } from "@/components/avatar-upload";
import { AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { TermsGate } from "@/components/terms-gate";
import { BirthDateSelect, birthPartsToIso } from "@/components/birth-date-select";

type Role = "ORDERER" | "PREPARER";

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status, update } = useSession();

  const [role, setRole] = useState<Role>(
    params.get("role") === "PREPARER" ? "PREPARER" : "ORDERER",
  );
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    login: "",
    password: "",
    about: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [birth, setBirth] = useState({ d: "", m: "", y: "" });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Google'dan kelgan ism-familiyani oldindan to'ldiramiz
  useEffect(() => {
    if (status !== "authenticated") return;
    if (session.user.profileComplete) {
      router.replace("/dashboard");
      return;
    }
    const parts = (session.user.name ?? "").trim().split(/\s+/);
    setForm((f) => ({
      ...f,
      firstName: f.firstName || parts[0] || "",
      lastName: f.lastName || parts.slice(1).join(" ") || "",
    }));
    if (!avatarUrl && session.user.image) setAvatarUrl(session.user.image);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!birth.d || !birth.m || !birth.y) {
      setErr("Tug'ilgan sanangizni tanlang");
      return;
    }
    if (!avatarUrl) {
      setErr("Glavniy rasmni yuklang");
      return;
    }
    if (!agree) {
      setErr("Davom etish uchun oferta shartlariga rozilik bering");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          ...form,
          avatarUrl,
          birthDate: birthPartsToIso(birth),
          acceptTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      await update();
      // to'liq qayta yuklash — server sessiyani yangi cookie bilan o'qisin
      window.location.assign("/dashboard");
      return;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <AuthShell>
        <p className="text-center text-sm text-zinc-500">Yuklanmoqda...</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="card p-7">
      <div>
        <h1 className="text-xl font-semibold text-white">Profilni to'ldiring</h1>
        <p className="mt-1 text-sm text-zinc-400">Barcha maydonlar majburiy.</p>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {(["ORDERER", "PREPARER"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-xl border p-3 text-left text-sm font-medium transition ${
                role === r
                  ? "border-indigo-400/70 bg-indigo-500/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
              {r === "ORDERER" ? "Buyurtma beruvchi" : "Tayyorlovchi"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ism</label>
            <input
              className="input"
              required
              minLength={2}
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Familiya</label>
            <input
              className="input"
              required
              minLength={2}
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Tug&apos;ilgan sana</label>
          <BirthDateSelect value={birth} onChange={setBirth} required />
        </div>

        <div>
          <label className="label">Login</label>
          <input
            className="input"
            required
            minLength={3}
            value={form.login}
            onChange={(e) => set("login", e.target.value)}
          />
        </div>

        <div>
          <label className="label">Parol</label>
          <PasswordInput
            required
            minLength={6}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Keyinchalik login + parol bilan ham kira olasiz.
          </p>
        </div>

        <div>
          <label className="label">Qo'shimcha ma'lumot</label>
          <textarea
            className="input"
            rows={3}
            required
            minLength={5}
            value={form.about}
            onChange={(e) => set("about", e.target.value)}
          />
        </div>

        <div>
          <label className="label">Glavniy rasm</label>
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} />
        </div>

        <div className="border-t border-white/10 pt-4">
          <TermsGate checked={agree} onChange={setAgree} />
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <button className="btn-primary" disabled={busy || !agree}>
          {busy ? "..." : "Saqlash va davom etish"}
        </button>
      </form>
      </div>
    </AuthShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
