"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Kiriş / çiqiş animatsiyalari (butun ekran):
 *  · <WelcomeOverlay name> — «Assalomu alaykum, Ism! Sizni körganimizdan xursandmiz», ~3 s turadi, so'ng yöqoladi;
 *  · <SignOutOverlay /> — «Hisobdan çiqilmoqda...», çiqiş tugaguncha (sahifa almaşguncha) turadi.
 * Fon — sahifa fonining özi (yorug'/qorong'i rejimga mos).
 * Bu fayl plus, smm-app va app.tayyorr.uz da bir xil.
 */

const CSS = `
@keyframes so-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes so-out { to { opacity: 0; transform: translateY(-16px) } }
@keyframes so-rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes so-wave { 0%,100% { transform: rotate(0) } 20% { transform: rotate(5deg) } 40% { transform: rotate(-3deg) } 60% { transform: rotate(4deg) } 80% { transform: rotate(-1deg) } }
@keyframes so-pop { from { opacity: 0; transform: scale(.4) } 70% { transform: scale(1.08) } to { opacity: 1; transform: scale(1) } }
@keyframes so-bar { from { width: 0 } to { width: 100% } }
@keyframes so-dot { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
.so-root { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 32px; text-align: center; animation: so-in .35s ease-out both; }
.so-root.so-leaving { animation: so-out .45s ease-in both; }
.so-rise { animation: so-rise .6s cubic-bezier(.2,.8,.2,1) both; }
.so-hand { display: block; width: 210px; height: 210px; margin: 0 auto; object-fit: contain; transform-origin: 50% 100%; animation: so-pop .55s cubic-bezier(.2,.9,.3,1.3) both, so-wave 1.6s .5s ease-in-out both; }
.so-bye { display: block; width: 220px; height: 220px; margin: 0 auto; object-fit: contain; animation: so-pop .5s cubic-bezier(.2,.9,.3,1.3) both; }
.so-grad { background: linear-gradient(90deg, #818cf8, #d946ef); -webkit-background-clip: text; background-clip: text; color: transparent; }
.so-track { width: 120px; height: 3px; border-radius: 99px; overflow: hidden; margin: 32px auto 0; background: color-mix(in srgb, currentColor 10%, transparent); }
.so-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #6366f1, #d946ef); animation: so-bar 2.2s 1s linear both; }
.so-dots span { animation: so-dot 1.2s ease-in-out infinite; }
.so-dots span:nth-child(2) { animation-delay: .2s } .so-dots span:nth-child(3) { animation-delay: .4s }
`;

function usePageColors() {
  const [c, setC] = useState<{ bg: string; fg: string } | null>(null);
  useEffect(() => {
    const s = getComputedStyle(document.body);
    const bg = s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)" ? s.backgroundColor : "#08080d";
    setC({ bg, fg: s.color || "#e4e4e7" });
  }, []);
  return c;
}

function Shell({ children, leaving }: { children: React.ReactNode; leaving?: boolean }) {
  const c = usePageColors();
  if (!c) return null;
  return createPortal(
    <div className={`so-root${leaving ? " so-leaving" : ""}`} style={{ background: c.bg, color: c.fg }} role="status" aria-live="polite">
      <style>{CSS}</style>
      <div>{children}</div>
    </div>,
    document.body,
  );
}

export function WelcomeOverlay({ name, onDone, duration = 3300 }: { name: string; onDone?: () => void; duration?: number }) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), duration - 450);
    const t2 = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, duration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration, onDone]);
  if (gone) return null;
  return (
    <Shell leaving={leaving}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="so-hand" src="/mascot/welcome.webp" alt="" aria-hidden width={210} height={210} />
      <p className="so-rise font-display" style={{ marginTop: 8, fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", animationDelay: ".3s" }}>
        Assalomu alaykum,
      </p>
      <p className="so-rise so-grad font-display" style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, animationDelay: ".7s" }}>
        {name}!
      </p>
      <p className="so-rise" style={{ marginTop: 14, fontSize: 17, opacity: 0.7, animationDelay: "1.15s" }}>
        Sizni körganimizdan xursandmiz
      </p>
      <div className="so-track so-rise" style={{ animationDelay: "1.15s" }}>
        <div className="so-fill" />
      </div>
    </Shell>
  );
}

export function SignOutOverlay({ name }: { name?: string | null }) {
  return (
    <Shell>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="so-bye" src="/mascot/goodbye.webp" alt="" aria-hidden width={220} height={220} />
      <p className="so-rise font-display" style={{ marginTop: 12, fontSize: 24, fontWeight: 700, animationDelay: ".15s" }}>
        Hisobdan çiqilmoqda
        <span className="so-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
      <p className="so-rise" style={{ marginTop: 8, fontSize: 15, opacity: 0.65, animationDelay: ".3s" }}>
        {name ? `Xayr, ${name}! Yana kutib qolamiz` : "Yana kutib qolamiz!"}
      </p>
    </Shell>
  );
}

/** Çiqiş animatsiyasini körsatib, kamida [minMs] dan keyin [run] ni çaqiradi. */
export function useSignOut(run: () => void | Promise<void>, minMs = 1800) {
  const [active, setActive] = useState(false);
  const start = () => {
    if (active) return;
    setActive(true);
    setTimeout(() => void run(), minMs);
  };
  return { active, start };
}
