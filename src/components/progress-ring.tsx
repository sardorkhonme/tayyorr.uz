/** Aylana yuklanish ko'rsatkichi, o'rtasida foiz (mobil ilova bilan bir xil). */
export function ProgressRing({
  pct,
  size = 42,
  stroke = 3,
  className = "",
  trackClass = "stroke-white/20",
  barClass = "stroke-white",
  textClass = "text-white",
}: {
  /** 0..100; null — hali noma'lum (aylanib turadi) */
  pct: number | null;
  size?: number;
  stroke?: number;
  className?: string;
  trackClass?: string;
  barClass?: string;
  textClass?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = pct == null ? 25 : Math.max(0, Math.min(100, pct));
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={pct ?? undefined}
    >
      <svg
        width={size}
        height={size}
        className={`-rotate-90 ${pct == null ? "animate-spin" : ""}`}
        aria-hidden
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          className={`${barClass} transition-[stroke-dashoffset] duration-200`}
        />
      </svg>
      {pct != null && (
        <span className={`absolute text-[10px] font-semibold tabular-nums ${textClass}`}>{Math.round(p)}%</span>
      )}
    </span>
  );
}
