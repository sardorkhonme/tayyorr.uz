"use client";

import { useEffect, useState } from "react";

/**
 * Platformalar (tayyorr.uz, app, tayyorr+, Tayyorr SMM) orasidagi o'tish animatsiyasi.
 * Boshqa subdomenga havola bosilganda yangi sayt yuklanguncha "qayerdan → qayerga" oynasi
 * ko'rinadi (sayt qotib qolgandek tuyulmasin); yangi saytda esa shu oyna silliq eriydi.
 * Bir xil fayl to'rt loyihada: src, landing, plus, smm-app (components/platform-transition.tsx).
 */
type Key = "landing" | "app" | "plus" | "smm";
const PLATFORMS: Record<Key, { name: string; mark: string; color: string }> = {
  landing: { name: "Tayyorr.uz", mark: "/logo-mark.png", color: "#6366f1" },
  app: { name: "Tayyorr.uz", mark: "/logo-mark.png", color: "#6366f1" },
  plus: { name: "tayyorr+", mark: "/plus-mark.png", color: "#8b5cf6" },
  smm: { name: "Tayyorr SMM", mark: "/smm-mark.png", color: "#d946ef" },
};

function platformOf(host: string): Key | null {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (h === "tayyorr.uz") return "landing";
  const m = /^(app|plus|smm)\.tayyorr\.uz$/.exec(h);
  return m ? (m[1] as Key) : null;
}

/** Yangi sahifa birinchi chizilishidan oldin ishlaydi: boshqa platformadan kelingan bo'lsa — "yetib keldik" oynasi. */
const ARRIVE_SCRIPT = `(function(){try{var r=document.referrer;if(!r)return;var a=new URL(r).hostname.replace(/^www\\./,''),b=location.hostname.replace(/^www\\./,'');if(a===b)return;var t=/^((app|plus|smm)\\.)?tayyorr\\.uz$/;if(t.test(a)&&t.test(b))document.documentElement.classList.add('pt-arrive');}catch(e){}})();`;

const CSS = `
.pt-veil{--pt-bg:rgba(250,250,252,.82);--pt-fg:#18181b;--pt-mute:#71717a;--pt-card:#fff;--pt-line:rgba(24,24,27,.08);
  position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
  background:radial-gradient(600px circle at 50% 45%,color-mix(in srgb,var(--pt-c) 16%,transparent),transparent 70%),var(--pt-bg);
  -webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2);color:var(--pt-fg);font-family:inherit}
.pt-dark{--pt-bg:rgba(6,6,11,.84);--pt-fg:#f4f4f5;--pt-mute:#a1a1aa;--pt-card:#15151d;--pt-line:rgba(255,255,255,.1)}
html:not(.light) .pt-auto{--pt-bg:rgba(6,6,11,.84);--pt-fg:#f4f4f5;--pt-mute:#a1a1aa;--pt-card:#15151d;--pt-line:rgba(255,255,255,.1)}
.pt-go{animation:pt-in .28s ease-out both}
.pt-row{display:flex;align-items:center;gap:14px}
.pt-mark{position:relative;display:grid;place-items:center;width:64px;height:64px;border-radius:20px;background:var(--pt-card);
  box-shadow:0 12px 30px -12px rgba(0,0,0,.25),0 0 0 1px var(--pt-line)}
.pt-mark img{width:42px;height:42px;object-fit:contain}
.pt-from{animation:pt-from .5s cubic-bezier(.22,1,.36,1) both}
.pt-to{width:84px;height:84px;border-radius:26px;animation:pt-to .6s .08s cubic-bezier(.22,1,.36,1) both}
.pt-to img{width:56px;height:56px}
.pt-to::after{content:"";position:absolute;inset:-6px;border-radius:30px;border:2px solid var(--pt-c);opacity:0;animation:pt-ring 1.4s .5s ease-out infinite}
.pt-beam{position:relative;width:92px;height:4px;border-radius:9px;background:var(--pt-line);overflow:hidden}
.pt-beam::before{content:"";position:absolute;inset:0;width:40%;border-radius:9px;background:linear-gradient(90deg,transparent,var(--pt-c),transparent);animation:pt-beam 1s linear infinite}
.pt-text{font-size:15px;font-weight:600;letter-spacing:-.01em;animation:pt-in .4s .15s both}
.pt-text span{color:var(--pt-c)}
.pt-sub{margin-top:-14px;font-size:13px;color:var(--pt-mute);animation:pt-in .4s .25s both}
.pt-dots i{display:inline-block;width:4px;height:4px;margin-left:3px;border-radius:9px;background:currentColor;animation:pt-dot 1.2s infinite}
.pt-dots i:nth-child(2){animation-delay:.15s}.pt-dots i:nth-child(3){animation-delay:.3s}
.pt-bar{position:fixed;left:0;top:0;height:3px;width:100%;transform-origin:left;background:linear-gradient(90deg,#6366f1,#a855f7,var(--pt-c));animation:pt-bar 6s cubic-bezier(.1,.7,.2,1) both}
.pt-arrive-veil{display:none}
html.pt-arrive .pt-arrive-veil{display:flex;pointer-events:none;animation:pt-out .55s .2s ease-in both}
html.pt-arrive .pt-arrive-veil .pt-to{animation:pt-land .75s cubic-bezier(.22,1,.36,1) both}
@keyframes pt-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes pt-from{from{opacity:0;transform:translateX(26px) scale(.9)}to{opacity:1;transform:none}}
@keyframes pt-to{from{opacity:0;transform:translateX(-26px) scale(.8)}to{opacity:1;transform:none}}
@keyframes pt-ring{0%{opacity:.7;transform:scale(.92)}100%{opacity:0;transform:scale(1.25)}}
@keyframes pt-beam{from{transform:translateX(-100%)}to{transform:translateX(260%)}}
@keyframes pt-dot{0%,80%,100%{opacity:.25}40%{opacity:1}}
@keyframes pt-bar{from{transform:scaleX(0)}to{transform:scaleX(.92)}}
@keyframes pt-out{to{opacity:0;visibility:hidden}}
@keyframes pt-land{from{transform:scale(1)}to{transform:scale(.6);opacity:0}}
@media (prefers-reduced-motion:reduce){.pt-veil *,.pt-veil{animation-duration:.01s!important;animation-iteration-count:1!important}}
`;

export function PlatformTransition({ theme = "light" }: { theme?: "light" | "dark" | "auto" }) {
  const [go, setGo] = useState<{ from: Key; to: Key } | null>(null);
  const [here, setHere] = useState<Key | null>(null);
  const themeCls = theme === "dark" ? "pt-dark" : theme === "auto" ? "pt-auto" : "";

  useEffect(() => {
    const cur = platformOf(location.hostname);
    setHere(cur);
    if (!cur) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (url.origin === location.origin || !/^https?:$/.test(url.protocol)) return;
      const to = platformOf(url.hostname);
      if (!to) return;
      setGo({ from: cur, to });
    };
    // "Orqaga" bilan qaytilsa (bfcache) — oyna yopiq bo'lsin
    const onShow = (e: PageTransitionEvent) => e.persisted && setGo(null);
    window.addEventListener("click", onClick);
    window.addEventListener("pageshow", onShow);
    // logolar oldindan yuklanib tursin — oyna darhol chiqsin
    const t = setTimeout(() => Object.values(PLATFORMS).forEach((p) => (new Image().src = p.mark)), 1500);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onShow);
      clearTimeout(t);
    };
  }, []);

  // o'tish to'xtab qolsa (tarmoq yo'q, foydalanuvchi bekor qildi) — oyna yopiladi
  useEffect(() => {
    if (!go) return;
    const t = setTimeout(() => setGo(null), 15000);
    return () => clearTimeout(t);
  }, [go]);

  const dest = go ? PLATFORMS[go.to] : null;
  const arrived = here ? PLATFORMS[here] : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script dangerouslySetInnerHTML={{ __html: ARRIVE_SCRIPT }} />

      {/* yangi saytda: ketish oynasining davomi — logo kichrayib, oyna eriydi */}
      <div className={`pt-veil pt-arrive-veil ${themeCls}`} style={{ "--pt-c": arrived?.color ?? "#6366f1" } as React.CSSProperties} aria-hidden>
        {arrived && (
          <span className="pt-mark pt-to">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={arrived.mark} alt="" />
          </span>
        )}
      </div>

      {go && dest && (
        <div
          className={`pt-veil pt-go ${themeCls}`}
          style={{ "--pt-c": dest.color } as React.CSSProperties}
          role="status"
          aria-live="polite"
        >
          <div className="pt-bar" />
          <div className="pt-row">
            <span className="pt-mark pt-from">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PLATFORMS[go.from].mark} alt="" />
            </span>
            <span className="pt-beam" />
            <span className="pt-mark pt-to">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dest.mark} alt="" />
            </span>
          </div>
          <p className="pt-text">
            <span>{dest.name}</span> ga ötilmoqda
            <span className="pt-dots">
              <i />
              <i />
              <i />
            </span>
          </p>
          <p className="pt-sub">Bitta hisob — qayta kiriş şart emas</p>
        </div>
      )}
    </>
  );
}
