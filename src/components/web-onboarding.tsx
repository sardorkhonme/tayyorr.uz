"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { Logo } from "@/components/logo";
import { Mascot, type MascotPose } from "@/components/mascot";

/**
 * Telefon/planşetda saytga BIRINÇI marta kirgan (tizimga kirmagan) foydalanuvçiga
 * 3 ta tanişuv sahifasi — mobil ilovadagi onboarding_screen.dart bilan bir xil.
 * Kompyuterda hech qachon çiqmaydi; körilgan/ötkazib yuborilgandan keyin ham.
 */
const SEEN_KEY = "tyr_onboarding_seen";

const PAGES: {
  tag: string;
  title: string;
  body: string;
  pose: MascotPose;
  glow: string;
  chips: { label: string; accent?: boolean; pos: string }[];
}[] = [
  {
    tag: "1 · Buyurtma",
    title: "Işingizni bir marta yozing",
    body: "Prezentatsiya, kurs işi, referat, diplom — şartlarni qoldiring, barça tayyorlovçilar köradi.",
    pose: "onboard-1",
    glow: "#6366f1",
    chips: [
      { label: "🎓 Diplom", pos: "right-0 top-[12%]" },
      { label: "📊 Prezentatsiya", pos: "left-0 bottom-[16%]" },
    ],
  },
  {
    tag: "2 · Tanlov",
    title: "Eng yaxşi taklifni tanlang",
    body: "Tayyorlovçilar narx va muddat taklif qiladi. Reyting va baholarga qarab özingizga mosini tanlaysiz.",
    pose: "onboard-2",
    glow: "#8b5cf6",
    chips: [
      { label: "★ 5.0", pos: "left-0 top-[13%]" },
      { label: "✓ 120 000 söm", accent: true, pos: "right-0 bottom-[14%]" },
    ],
  },
  {
    tag: "3 · Xavfsiz",
    title: "Pul iş tugagaç ötadi",
    body: "Mablağ şartnoma vaqtida hamyonda saqlanadi, iş topşirilgaç tayyorlovçiga ötadi. Hammasi çat orqali.",
    pose: "onboard-3",
    glow: "#10b981",
    chips: [
      { label: "✓ Iş tayyor", accent: true, pos: "left-0 top-[13%]" },
      { label: "💬 Çat", pos: "right-0 bottom-[14%]" },
    ],
  },
];

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* e'tiborsiz */
  }
  document.cookie = `${SEEN_KEY}=1; path=/; max-age=31536000; samesite=lax`;
}

function alreadySeen() {
  try {
    if (localStorage.getItem(SEEN_KEY)) return true;
  } catch {
    /* e'tiborsiz */
  }
  return document.cookie.split("; ").some((c) => c.startsWith(`${SEEN_KEY}=`));
}

export function WebOnboarding() {
  const pathname = usePathname();
  const { status } = useSession();
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [page, setPage] = useState(0);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (!/^\/(login|register)(\/|$)/.test(pathname)) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    if (alreadySeen()) return;
    setShow(true);
  }, [status, pathname]);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  const last = page === PAGES.length - 1;
  const finish = () => {
    markSeen();
    setLeaving(true);
    setTimeout(() => setShow(false), 380);
  };
  const next = () => (last ? finish() : setPage((p) => p + 1));
  const prev = () => setPage((p) => Math.max(0, p - 1));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tanişuv"
      className={`fixed inset-0 z-[90] flex flex-col bg-[#0a0a0f] transition-opacity duration-300 lg:hidden ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx < -50) next();
        else if (dx > 50) prev();
      }}
    >
      <div className="flex items-center justify-between px-5 pt-3">
        <Logo className="text-xl" markClassName="h-7" />
        <button
          type="button"
          onClick={finish}
          className={`rounded-full px-3 py-2 text-sm text-zinc-400 transition hover:text-white ${
            last ? "pointer-events-none opacity-0" : ""
          }`}
        >
          Ötkazib yuboriş
        </button>
      </div>

      {/* sahifalar — gorizontal lenta */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {PAGES.map((p, i) => (
            <section
              key={p.pose}
              aria-hidden={i !== page}
              className={`flex h-full w-full shrink-0 flex-col items-center px-6 transition-opacity duration-300 ${
                i === page ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                <div className="relative aspect-square w-full max-w-[320px]">
                  <span
                    aria-hidden
                    className="absolute inset-[2%] rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${p.glow}4d 0%, ${p.glow}00 70%)`,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Mascot pose={p.pose} size={280} priority={i === 0} className="max-h-full max-w-[86%]" />
                  </span>
                  {p.chips.map((c) => (
                    <span
                      key={c.label}
                      className={`mascot-float absolute ${c.pos} rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs backdrop-blur-md ${
                        c.accent ? "font-bold text-emerald-400" : "font-medium text-zinc-200"
                      }`}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pb-7 text-center">
                <span className="inline-block rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-300">
                  {p.tag}
                </span>
                <h2 className="mt-3.5 text-[26px] font-bold leading-tight tracking-tight text-white">
                  {p.title}
                </h2>
                <p className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed text-zinc-400">
                  {p.body}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* nuqtalar — joriy sahifa cho'ziluvchi gradient tayoqcha */}
      <div className="flex justify-center gap-2">
        {PAGES.map((p, i) => (
          <button
            key={p.pose}
            type="button"
            aria-label={`${i + 1}-sahifa`}
            onClick={() => setPage(i)}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === page ? 30 : 8,
              background:
                i === page ? "linear-gradient(90deg,#6366f1,#a78bfa)" : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>
      <div className="px-6 pb-5 pt-6">
        <button type="button" onClick={next} className="btn-primary w-full py-3 text-base">
          {last ? "Boşlaş" : "Keyingisi"}
        </button>
      </div>
    </div>
  );
}
