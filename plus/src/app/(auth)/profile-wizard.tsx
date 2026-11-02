"use client";

import { useRef, useState, useTransition } from "react";

import { HearLogo } from "@/components/hear-logos";
import { Icon } from "@/components/icons";
import { HEAR_ABOUT_US } from "@/lib/hear-about-us";

import { completeProfileAction } from "./actions";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 91 }, (_, i) => THIS_YEAR - 10 - i); // 10–100 yosh

/** Rasmni brauzerning o'zida kichraytiradi (512px, JPEG) — tez yuklanadi. */
async function resizeImage(file: File, max = 512): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">
        {label} {hint && <span className="font-normal text-zinc-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Ro'yxatdan o'tishni yakunlash (Google yoki email bilan kirgandan keyin) —
 * tayyorr.uz dagi bilan bir xil 2 qadam (rolsiz):
 * 1) bizni qayerdan eshitdingiz  2) profil — ism, familiya, tug'ilgan sana,
 * login, (parol — Google hisobida), o'zingiz haqingizda, rasm.
 */
export function ProfileWizard({
  initial,
  needsPassword = true,
}: {
  initial?: { firstName?: string; lastName?: string; avatar?: string | null };
  needsPassword?: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [hear, setHear] = useState("");
  const [hearDetail, setHearDetail] = useState("");
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    login: "",
    password: "",
    about: "",
  });
  const [birth, setBirth] = useState({ d: "", m: "", y: "" });
  const [avatar, setAvatar] = useState(initial?.avatar ?? "");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function fail(msg: string) {
    setError(msg);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function pickImage(file: File) {
    if (!file.type.startsWith("image/")) return fail("Rasm faylini tanlang");
    if (file.size > 15 * 1024 * 1024) return fail("Rasm hajmi 15MB dan oshmasin");
    try {
      setAvatar(await resizeImage(file));
      setError("");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Rasmni o'qib bo'lmadi");
    }
  }

  function next() {
    if (!hear) return fail("Variantlardan birini tanlang");
    if (hear === "other" && !hearDetail.trim()) return fail("Qayerdan eshitganingizni yozing");
    setError("");
    setStep(2);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!avatar) return fail("Profil rasmini yuklang");
    if (!birth.d || !birth.m || !birth.y) return fail("Tug'ilgan sanangizni tanlang");
    const payload = {
      hearAboutUs: hear,
      hearAboutUsDetail: hear === "other" ? hearDetail.trim() : undefined,
      firstName: form.firstName,
      lastName: form.lastName,
      birthDate: `${birth.y}-${birth.m.padStart(2, "0")}-${birth.d.padStart(2, "0")}`,
      login: form.login,
      about: form.about,
      avatar,
      password: needsPassword ? form.password : undefined,
    };
    start(async () => {
      const res = await completeProfileAction(payload);
      if (res?.error) fail(res.error);
    });
  }

  const daysInMonth = new Date(Number(birth.y) || 2000, Number(birth.m) || 1, 0).getDate();

  return (
    <div ref={topRef} className="scroll-mt-6">
      {/* qadamlar ko'rsatkichi */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-600">{step}-qadam / 2</span>
        <div className="flex gap-1.5">
          <span className={`h-1.5 w-8 rounded-full ${step === 1 ? "bg-indigo-500" : "bg-emerald-500"}`} />
          <span className={`h-1.5 w-8 rounded-full ${step === 2 ? "bg-indigo-500" : "bg-zinc-200"}`} />
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-zinc-900">Bizni qayerdan eshitdingiz?</h2>
            <p className="mt-1 text-zinc-500">Mos variantni tanlang.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {HEAR_ABOUT_US.map((h) => (
              <button
                key={h.value}
                type="button"
                onClick={() => setHear(h.value)}
                className={`glow-card flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-[15px] font-medium ${
                  hear === h.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-4 ring-indigo-100"
                    : "border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                <HearLogo value={h.value} className="h-7 w-7 shrink-0" />
                <span className="leading-tight">{h.label}</span>
              </button>
            ))}
          </div>
          {hear === "other" && (
            <input
              className="input"
              placeholder="Masalan: YouTube, TikTok, universitetda, ko'cha banneridan..."
              value={hearDetail}
              onChange={(e) => setHearDetail(e.target.value)}
              maxLength={200}
              autoFocus
            />
          )}
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={next} className="btn-primary w-full !py-4 !text-base">
            Davom etish <Icon name="arrow-right" className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-zinc-900">Profilni to&apos;ldiring</h2>
            <p className="mt-1 text-zinc-500">Barcha maydonlar majburiy.</p>
          </div>

          {/* rasm */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50 text-2xl text-zinc-400 transition hover:border-indigo-400"
              aria-label="Profil rasmini tanlash"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="camera" className="h-7 w-7" />
              )}
            </button>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost !py-2 !text-sm">
                {avatar ? "Rasmni almashtirish" : "Rasm tanlash"}
              </button>
              <p className="mt-1.5 text-xs text-zinc-500">Profil (glavniy) rasm — majburiy</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ism">
              <input className="input" value={form.firstName} onChange={set("firstName")} autoComplete="given-name" required />
            </Field>
            <Field label="Familiya">
              <input className="input" value={form.lastName} onChange={set("lastName")} autoComplete="family-name" required />
            </Field>
          </div>

          <Field label="Tug'ilgan sana">
            <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2">
              <select className="input" value={birth.d} onChange={(e) => setBirth((b) => ({ ...b, d: e.target.value }))} required>
                <option value="">Kun</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select className="input" value={birth.m} onChange={(e) => setBirth((b) => ({ ...b, m: e.target.value }))} required>
                <option value="">Oy</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select className="input" value={birth.y} onChange={(e) => setBirth((b) => ({ ...b, y: e.target.value }))} required>
                <option value="">Yil</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Login" hint="(lotin harf, raqam, _ .)">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">@</span>
              <input
                className="input !pl-8"
                value={form.login}
                onChange={set("login")}
                autoComplete="username"
                pattern="[a-zA-Z0-9_.]{3,30}"
                title="3–30 belgi: lotin harf, raqam, _ va ."
                required
              />
            </div>
          </Field>


          {needsPassword && (
            <Field label="Parol" hint="(kamida 6 belgi)">
              <div className="relative">
                <input
                  className="input pr-24"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {showPw ? "Yashirish" : "Ko'rsatish"}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">Barcha tayyorr xizmatlariga shu login/email va parol bilan kirasiz.</p>
            </Field>
          )}

          <Field label="O'zingiz haqingizda">
            <textarea
              className="input min-h-24 resize-y"
              value={form.about}
              onChange={set("about")}
              placeholder="Masalan: talabaman, blog yuritaman…"
              maxLength={1000}
              required
            />
          </Field>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button className="btn-primary w-full !py-4 !text-base" disabled={pending}>
            {pending ? "Saqlanmoqda…" : "Ro'yxatdan o'tishni yakunlash"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep(1);
            }}
            className="w-full text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon name="arrow-left" className="h-4 w-4" /> Orqaga
            </span>
          </button>
        </form>
      )}
    </div>
  );
}
