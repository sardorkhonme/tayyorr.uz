"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Liquid glass — oddiy xira shisha emas, haqiqiy sinish: element o'lchamiga mos "sinish xaritasi"
 * (displacement map) canvas'da chiziladi va SVG feDisplacementMap orqali backdrop-filter'ga beriladi.
 * Chetlarda (bezel) orqa fon linzadek ichkariga bukiladi, markaz tiniq qoladi.
 * backdrop-filter: url(#...) faqat Chromium'da ishlaydi — boshqa brauzerlarda oddiy shisha qoladi.
 */
export function LiquidGlass({
  as: Tag = "div",
  className = "",
  radius = 16,
  bezel = 22,
  scale = 46,
  style,
  children,
}: {
  as?: "div" | "nav" | "span";
  className?: string;
  /** burchak radiusi (px) — elementning border-radius bilan bir xil bo'lsin */
  radius?: number;
  /** sinish zonasi qalinligi (px) */
  bezel?: number;
  /** sinish kuchi */
  scale?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const id = `lg-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [map, setMap] = useState<{ url: string; w: number; h: number } | null>(null);
  const [refract, setRefract] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    // iOS'dagi barcha brauzerlar WebKit — u yerda url() filtri ishlamaydi
    const chromium = /Chrome\/|Chromium\/|Edg\//.test(ua) && !/iPhone|iPad|iPod/.test(ua);
    if (!chromium || !ref.current) return;
    setRefract(true);

    const el = ref.current;
    let last = "";
    const draw = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (!w || !h || `${w}x${h}` === last) return;
      last = `${w}x${h}`;
      setMap({ url: buildMap(w, h, Math.min(radius, h / 2), Math.min(bezel, h / 2)), w, h });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [radius, bezel]);

  return (
    <>
      {refract && map && (
        <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
          <filter id={id} x="0" y="0" width={map.w} height={map.h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feImage href={map.url} x="0" y="0" width={map.w} height={map.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        data-refract={refract && map ? "" : undefined}
        style={{ ...style, "--lg-filter": `url(#${id})` } as React.CSSProperties}
        className={`liquid-glass ${className}`}
      >
        {children}
      </Tag>
    </>
  );
}

/** Yumaloq to'rtburchak uchun sinish xaritasi: R — x siljish, G — y siljish (128 — siljimaydi). */
function buildMap(w: number, h: number, r: number, bezel: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const hx = w / 2;
  const hy = h / 2;

  // yumaloq to'rtburchakgacha masofa (ichkarida manfiy)
  const sdf = (x: number, y: number) => {
    const qx = Math.abs(x - hx) - (hx - r);
    const qy = Math.abs(y - hy) - (hy - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = -sdf(px, py); // chetgacha masofa (ichkarida musbat)
      let dx = 0;
      let dy = 0;
      if (d < bezel) {
        // tashqariga yo'nalgan normal (gradient)
        const nx = sdf(px + 1, py) - sdf(px - 1, py);
        const ny = sdf(px, py + 1) - sdf(px, py - 1);
        const len = Math.hypot(nx, ny) || 1;
        // qavariq linza: chetga yaqinlashgan sari kuchli sinadi
        const t = 1 - Math.max(d, 0) / bezel;
        const mag = 1 - Math.sqrt(1 - t * t);
        dx = (-nx / len) * mag;
        dy = (-ny / len) * mag;
      }
      const i = (y * w + x) * 4;
      img.data[i] = 128 + dx * 127;
      img.data[i + 1] = 128 + dy * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}
