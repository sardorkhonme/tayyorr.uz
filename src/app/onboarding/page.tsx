"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { AvatarUpload } from "@/components/avatar-upload";
import { AuthShell } from "@/components/auth-shell";
import { PasswordInput } from "@/components/password-input";
import { TermsGate } from "@/components/terms-gate";
import { BirthDateSelect, birthPartsToIso } from "@/components/birth-date-select";
import {
  HearAboutUsSelect,
  type HearAboutUsValue,
} from "@/components/hear-about-us-select";

type Role = "ORDERER" | "PREPARER";

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status, update } = useSession();

  const [step, setStep] = useState<1 | 2>(1);
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
  const [hearAboutUs, setHearAboutUs] = useState<HearAboutUsValue>("");
  const [hearAboutUsDetail, setHearAboutUsDetail] = useState("");
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

  function handleContinueStep1() {
    setErr(null);
    if (!hearAboutUs) {
      setErr("Iltimos, variantlardan birini tanlang");
      return;
    }
    if (hearAboutUs === "other" && !hearAboutUsDetail.trim()) {
      setErr("Qayerdan eshitganingizni yozing");
      return;
    }
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!hearAboutUs) {
      setErr("Bizni qayerdan eshitganingizni tanlang");
      setStep(1);
      return;
    }
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
          hearAboutUs,
          hearAboutUsDetail:
            hearAboutUs === "other" ? hearAboutUsDetail.trim() : undefined,
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
        {/* Qadamlar ko'rsatkichi */}
        <div className="mb-4 flex items-center justify-between text-xs">
          <span className="font-semibold text-indigo-400">
            {step === 1 ? "1-qadam / 2" : "2-qadam / 2"}
          </span>
          <div className="flex gap-1.5">
            <span
              className={`h-1.5 w-7 rounded-full transition ${
                step === 1 ? "bg-indigo-500" : "bg-emerald-500"
              }`}
            />
            <span
              className={`h-1.5 w-7 rounded-full transition ${
                step === 2 ? "bg-indigo-500" : "bg-white/10"
              }`}
            />
          </div>
        </div>

        {/* 1-QADAM: Bizni qayerdan eshitdingiz? */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-semibold text-white">
                Bizni qayerdan eshitdingiz?
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Tayyorr.uz haqida ma'lumotni qayerdan oldingiz? Mos variantni
                tanlang.
              </p>
            </div>

            <HearAboutUsSelect
              value={hearAboutUs}
              onChange={setHearAboutUs}
              detail={hearAboutUsDetail}
              onDetailChange={setHearAboutUsDetail}
            />

            {err && <p className="text-sm text-red-400">{err}</p>}

            <button
              type="button"
              onClick={handleContinueStep1}
              disabled={
                !hearAboutUs ||
                (hearAboutUs === "other" && !hearAboutUsDetail.trim())
              }
              className="btn-primary w-full py-3 text-sm font-semibold"
            >
              Davom etish →
            </button>
          </div>
        )}

        {/* 2-QADAM: Profil ma'lumotlarini to'ldirish */}
        {step === 2 && (
          <div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                Profilni to'ldiring
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Barcha maydonlar majburiy.
              </p>
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

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setErr(null);
                    setStep(1);
                  }}
                  className="btn-secondary px-4 text-sm"
                >
                  ← Orqaga
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-3 text-sm font-semibold"
                  disabled={busy || !agree}
                >
                  {busy ? "Saqlanmoqda..." : "Saqlash va davom etish"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Hisobingiz bormi? Kirish */}
      <p className="mt-5 text-center text-sm text-zinc-500">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
