"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Statistika chartlari — kutubxonasiz SVG. Ranglar globals.css dagi .viz o'zgaruvchilaridan
 * (qorong'i/yorug' rejim uchun alohida tekshirilgan qiymatlar). Har chartda hover tooltip bor.
 */

export type Fmt = "count" | "som";
export type Series = { name: string; values: number[]; slot: 1 | 2 | 3 };

const nf = new Intl.NumberFormat("ru-RU");
export function fmtValue(v: number, f: Fmt) {
  return f === "som" ? `${nf.format(Math.round(v))} söm` : nf.format(Math.round(v));
}
/** O'q yozuvlari uchun qisqa: 1,2 mln · 350 ming */
function short(v: number) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)} mlrd`;
  if (a >= 1e6) return `${+(v / 1e6).toFixed(1)} mln`;
  if (a >= 1e3) return `${+(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)} ming`;
  return String(Math.round(v));
}
/** 0 dan boshlanadigan "chiroyli" shkala: 4 ta oraliq. */
function niceMax(max: number, integer = false) {
  if (max <= 0) return { top: 4, step: 1 };
  if (integer && max <= 4) return { top: 4, step: 1 };
  const raw = max / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const steps = (integer && p < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]).map((m) => m * p);
  const step = Math.max(steps.find((s) => s >= raw) ?? 10 * p, integer ? 1 : 0);
  return { top: step * 4, step };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const color = (slot: number) => `var(--viz-${slot})`;

function Legend({ series, f }: { series: Series[]; f: Fmt }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--viz-muted)" }}>
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(s.slot) }} />
          {s.name}
          <b className="font-semibold" style={{ color: "var(--viz-text)" }}>
            {fmtValue(
              s.values.reduce((a, b) => a + b, 0),
              f,
            )}
          </b>
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, w, title, rows, f }: { x: number; w: number; title: string; rows: { name: string; v: number; slot: number }[]; f: Fmt }) {
  const left = Math.min(Math.max(x, 90), w - 90);
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 min-w-[150px] -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ left, background: "var(--viz-tip)", color: "var(--viz-text)", border: "1px solid var(--viz-grid)" }}
    >
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map((r) => (
        <p key={r.name} className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5" style={{ color: "var(--viz-muted)" }}>
            {rows.length > 1 && <span className="h-2 w-2 rounded-sm" style={{ background: color(r.slot) }} />}
            {r.name}
          </span>
          <b className="tabular-nums">{fmtValue(r.v, f)}</b>
        </p>
      ))}
    </div>
  );
}

const PAD = { l: 52, r: 8, t: 12, b: 26 };

function Axes({ w, h, top, step, labels, xAt, every }: { w: number; h: number; top: number; step: number; labels: string[]; xAt: (i: number) => number; every: number }) {
  const ih = h - PAD.t - PAD.b;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  return (
    <g fontSize="11" fill="var(--viz-axis)">
      {ticks.map((t) => {
        const y = PAD.t + ih - (t / top) * ih;
        return (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y} y2={y} stroke="var(--viz-grid)" />
            <text x={PAD.l - 8} y={y + 4} textAnchor="end">
              {short(t)}
            </text>
          </g>
        );
      })}
      {labels.map((l, i) => {
        const last = i === labels.length - 1;
        // oxirgi yozuv doim; unga juda yaqin oddiy yozuv tushirib qoldiriladi
        if (!last && (i % every !== 0 || labels.length - 1 - i < every * 0.7)) return null;
        return (
          <text key={i} x={last ? Math.min(xAt(i) + 12, w - PAD.r) : xAt(i)} y={h - 6} textAnchor={last ? "end" : "middle"}>
            {l}
          </text>
        );
      })}
    </g>
  );
}

/** Ustunli chart: bitta yoki ustma-ust (stacked) seriyalar. */
export function ColumnChart({ labels, series, f = "count", height = 220, stacked = true }: { labels: string[]; series: Series[]; f?: Fmt; height?: number; stacked?: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const max = stacked ? Math.max(...totals) : Math.max(...series.flatMap((s) => s.values));
  const { top, step } = niceMax(max, f === "count");
  const iw = Math.max(w - PAD.l - PAD.r, 1);
  const ih = height - PAD.t - PAD.b;
  const band = iw / n;
  const gap = Math.min(Math.max(band * 0.28, 2), 14);
  const bw = Math.max(band - gap, 1);
  const xAt = (i: number) => PAD.l + band * i + band / 2;
  const yOf = (v: number) => (v / top) * ih;
  const every = Math.ceil(n / Math.max(Math.floor(iw / 64), 1));
  const r = Math.min(4, bw / 2);

  // yuqori burchaklari yumaloq ustun (pastki qismi asosga yopishgan)
  const col = (x: number, y: number, ww: number, hh: number, round: boolean) => {
    if (hh <= 0) return "";
    const rr = round ? Math.min(r, hh) : 0;
    return `M${x},${y + hh}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + ww - rr}Q${x + ww},${y} ${x + ww},${y + rr}V${y + hh}Z`;
  };

  return (
    <div ref={ref} className="relative">
      <Legend series={series} f={f} />
      {w > 0 && (
        <div className="relative">
          <svg width={w} height={height} role="img" aria-label={series.map((s) => s.name).join(", ")}>
            <Axes w={w} h={height} top={top} step={step} labels={labels} xAt={xAt} every={every} />
            {labels.map((_, i) => {
              const x = xAt(i) - bw / 2;
              let base = PAD.t + ih;
              const visible = series.filter((s) => s.values[i] > 0);
              return (
                <g key={i} opacity={hover == null || hover === i ? 1 : 0.45}>
                  {stacked
                    ? visible.map((s, j) => {
                        const hh = yOf(s.values[i]);
                        // segmentlar orasida 2px sirt rangidagi bo'shliq
                        const seg = Math.max(hh - (j > 0 ? 2 : 0), 0.5);
                        base -= hh;
                        return <path key={s.name} d={col(x, base + (hh - seg), bw, seg, j === visible.length - 1)} fill={color(s.slot)} />;
                      })
                    : series.map((s, j) => {
                        const sw = (bw - 2 * (series.length - 1)) / series.length;
                        const hh = yOf(s.values[i]);
                        return <path key={s.name} d={col(x + j * (sw + 2), PAD.t + ih - hh, sw, hh, true)} fill={color(s.slot)} />;
                      })}
                  <rect
                    x={PAD.l + band * i}
                    y={PAD.t}
                    width={band}
                    height={ih}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setHover(i)}
                  />
                </g>
              );
            })}
          </svg>
          {hover != null && (
            <Tooltip
              x={xAt(hover)}
              w={w}
              title={labels[hover]}
              f={f}
              rows={[
                ...series.map((s) => ({ name: s.name, v: s.values[hover], slot: s.slot })),
                ...(stacked && series.length > 1 ? [{ name: "Jami", v: totals[hover], slot: 0 }] : []),
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Chiziqli chart — vaqt bo'yicha o'zgarish; kursor chizig'i + tooltip. */
export function LineChart({ labels, series, f = "count", height = 220 }: { labels: string[]; series: Series[]; f?: Fmt; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const { top, step } = niceMax(Math.max(...series.flatMap((s) => s.values)), f === "count");
  const iw = Math.max(w - PAD.l - PAD.r, 1);
  const ih = height - PAD.t - PAD.b;
  const xAt = (i: number) => PAD.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const yAt = (v: number) => PAD.t + ih - (v / top) * ih;
  const every = Math.ceil(n / Math.max(Math.floor(iw / 64), 1));

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    setHover(Math.min(Math.max(i, 0), n - 1));
  }

  return (
    <div ref={ref} className="relative">
      <Legend series={series} f={f} />
      {w > 0 && (
        <div className="relative">
          <svg width={w} height={height} role="img" aria-label={series.map((s) => s.name).join(", ")}>
            <Axes w={w} h={height} top={top} step={step} labels={labels} xAt={xAt} every={every} />
            {series.length === 1 && (
              <path
                d={`M${xAt(0)},${PAD.t + ih} ${series[0].values.map((v, i) => `L${xAt(i)},${yAt(v)}`).join(" ")} L${xAt(n - 1)},${PAD.t + ih}Z`}
                fill={color(series[0].slot)}
                opacity={0.12}
              />
            )}
            {series.map((s) => (
              <polyline
                key={s.name}
                points={s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")}
                fill="none"
                stroke={color(s.slot)}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {hover != null && (
              <>
                <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--viz-axis)" strokeDasharray="3 3" />
                {series.map((s) => (
                  <circle key={s.name} cx={xAt(hover)} cy={yAt(s.values[hover])} r={4.5} fill={color(s.slot)} stroke="var(--viz-surface)" strokeWidth={2} />
                ))}
              </>
            )}
            <rect
              x={PAD.l}
              y={PAD.t}
              width={iw}
              height={ih}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
          {hover != null && (
            <Tooltip x={xAt(hover)} w={w} title={labels[hover]} f={f} rows={series.map((s) => ({ name: s.name, v: s.values[hover], slot: s.slot }))} />
          )}
        </div>
      )}
    </div>
  );
}

/** Gorizontal ustunlar — kategoriyalar taqqoslash (bitta rang, nomi yozuvda). */
export function HBars({ items, f = "count", sub }: { items: { label: string; value: number; extra?: string }[]; f?: Fmt; sub?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((a, b) => a + b.value, 0);
  if (!items.length) return <Empty />;
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => {
        const pct = total ? Math.round((it.value / total) * 100) : 0;
        return (
          <div key={it.label} className="group" title={`${it.label}: ${fmtValue(it.value, f)} (${pct}%)${it.extra ? ` · ${it.extra}` : ""}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate" style={{ color: "var(--viz-text)" }}>
                {it.label}
              </span>
              <span className="shrink-0 tabular-nums" style={{ color: "var(--viz-text)" }}>
                {fmtValue(it.value, f)} <span style={{ color: "var(--viz-muted)" }}>· {pct}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--viz-grid)" }}>
              <div
                className="h-full rounded-full transition-all group-hover:brightness-110"
                style={{ width: `${Math.max((it.value / max) * 100, 1.5)}%`, background: "var(--viz-1)" }}
              />
            </div>
            {it.extra && (
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--viz-muted)" }}>
                {it.extra}
              </p>
            )}
          </div>
        );
      })}
      {sub && (
        <p className="pt-1 text-xs" style={{ color: "var(--viz-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

const DAYS = ["Du", "Se", "Ça", "Pa", "Ju", "Şa", "Ya"];

/** Hafta kuni × soat — qaysi vaqtda faollik ko'p (bitta rang, och → to'q). */
export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(...grid.flat(), 1);
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const total = grid.flat().reduce((a, b) => a + b, 0);
  if (!total) return <Empty />;
  const peak = grid.flatMap((row, d) => row.map((v, h) => ({ d, h, v }))).sort((a, b) => b.v - a.v)[0];
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }}>
            {grid.map((row, d) => (
              <div key={d} className="contents">
                <span className="self-center text-[11px]" style={{ color: "var(--viz-axis)" }}>
                  {DAYS[d]}
                </span>
                {row.map((v, h) => {
                  const t = v / max;
                  return (
                    <span
                      key={h}
                      onMouseEnter={() => setHover({ d, h })}
                      onMouseLeave={() => setHover(null)}
                      className="aspect-square rounded-[4px] transition-transform hover:scale-110"
                      style={{
                        background: v ? `color-mix(in oklab, var(--viz-1) ${Math.round(18 + t * 82)}%, var(--viz-surface))` : "var(--viz-grid)",
                        outline: hover?.d === d && hover.h === h ? "2px solid var(--viz-text)" : undefined,
                      }}
                    />
                  );
                })}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center text-[10px]" style={{ color: "var(--viz-axis)" }}>
                {h % 3 === 0 ? h : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "var(--viz-muted)" }}>
        <span>
          {hover ? (
            <>
              <b style={{ color: "var(--viz-text)" }}>
                {DAYS[hover.d]}, {String(hover.h).padStart(2, "0")}:00–{String(hover.h + 1).padStart(2, "0")}:00
              </b>{" "}
              — {fmtValue(grid[hover.d][hover.h], "count")} ta amal
            </>
          ) : (
            <>
              Eng faol vaqt:{" "}
              <b style={{ color: "var(--viz-text)" }}>
                {DAYS[peak.d]}, {String(peak.h).padStart(2, "0")}:00
              </b>{" "}
              ({fmtValue(peak.v, "count")} ta)
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          kam
          {[0.18, 0.4, 0.6, 0.8, 1].map((t) => (
            <span key={t} className="h-3 w-3 rounded-[3px]" style={{ background: `color-mix(in oklab, var(--viz-1) ${Math.round(t * 100)}%, var(--viz-surface))` }} />
          ))}
          köp
        </span>
      </div>
    </div>
  );
}

/** Burchakdagi "!" — bosilganda statistika haqida batafsil izoh (tashqariga bosilsa yoki Esc — yopiladi). */
export function InfoTip({ text, className = "" }: { text: string | string[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);

  // oyna ekrandan chiqib ketmasin: tugma ostida, chap/o'ng chegaraga qisiladi; pastda joy bo'lmasa — tepada
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const vw = document.documentElement.clientWidth;
      const width = Math.min(320, vw - 24);
      const left = Math.min(Math.max(r.right - width, 12), vw - width - 12);
      const h = pop.current?.offsetHeight ?? 0;
      const below = r.bottom + 8;
      const top = below + h > window.innerHeight - 8 && r.top - 8 - h > 8 ? r.top - 8 - h : below;
      setPos({ left, top, width });
    };
    place();
    requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const parts = Array.isArray(text) ? text : [text];
  return (
    <span ref={ref} className={`absolute right-3 top-3 z-20 ${className}`}>
      <button
        type="button"
        ref={btn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Batafsil maʼlumot"
        aria-expanded={open}
        className="grid h-6 w-6 place-items-center rounded-full text-[13px] font-bold leading-none transition hover:scale-110"
        style={{
          background: open ? "var(--viz-1)" : "var(--viz-grid)",
          color: open ? "#fff" : "var(--viz-muted)",
          border: "1px solid var(--viz-grid)",
        }}
      >
        !
      </button>
      {open &&
        createPortal(
        <span
          ref={pop}
          role="tooltip"
          className="viz fixed z-[60] block space-y-2 rounded-xl p-3.5 text-left text-[13px] font-normal leading-relaxed shadow-2xl"
          style={{
            left: pos?.left ?? -9999,
            top: pos?.top ?? 0,
            width: pos?.width ?? 320,
            background: "var(--viz-tip)",
            color: "var(--viz-text)",
            border: "1px solid var(--viz-grid)",
          }}
        >
          {parts.map((t, i) => (
            <span key={i} className="block">
              {t}
            </span>
          ))}
        </span>,
          document.body,
        )}
    </span>
  );
}

/** KPI plitkasi: qiymat, oldingi davrga nisbatan o'zgarish va kichik trend chizig'i. */
export function Kpi({ label, cur, prev, f = "count", spark, info }: { label: string; cur: number; prev: number; f?: Fmt; spark?: number[]; info: string[] }) {
  const diff = prev ? Math.round(((cur - prev) / prev) * 100) : cur ? 100 : 0;
  const up = cur >= prev;
  const s = spark && spark.length > 1 ? spark : null;
  const sMax = s ? Math.max(...s, 1) : 1;
  return (
    <div className="viz-card relative flex flex-col gap-1 rounded-2xl p-4">
      <InfoTip
        className="!right-2.5 !top-2.5"
        text={[...info, "▲/▼ foiz — xuddi şunça uzunlikdagi oldingi davrga nisbatan (masalan, 30 kun tanlansa — undan oldingi 30 kun). Kiçik çiziq — şu davr içidagi kunlik (1 yilda oylik) özgariş."]}
      />
      <span className="pr-7 text-xs" style={{ color: "var(--viz-muted)" }}>
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--viz-text)" }}>
        {fmtValue(cur, f)}
      </span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-xs" style={{ color: "var(--viz-muted)" }}>
          {cur === prev ? (
            "özgarişsiz"
          ) : (
            <>
              <span style={{ color: up ? "var(--viz-good)" : "var(--viz-bad)" }}>
                {up ? "▲" : "▼"} {Math.abs(diff)}%
              </span>
              <span className="hidden sm:inline"> oldingi davrga</span>
            </>
          )}
        </span>
        {s && (
          <svg width="72" height="24" viewBox={`0 0 ${s.length - 1} 24`} preserveAspectRatio="none" className="shrink-0" aria-hidden>
            <polyline
              points={s.map((v, i) => `${i},${22 - (v / sMax) * 20}`).join(" ")}
              fill="none"
              stroke="var(--viz-1)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

export function Empty() {
  return (
    <p className="py-8 text-center text-sm" style={{ color: "var(--viz-muted)" }}>
      Bu davrda maʼlumot yöq
    </p>
  );
}
