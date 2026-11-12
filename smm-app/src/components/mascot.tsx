/**
 * «Tayyor-Man» — brend maskoti. Rasmlar `/mascot/*.webp` (asl PNG lardan lossless WebP:
 * pikselma-piksel bir xil). Oddiy <img> — Next rasm optimizatsiyasi qayta siqmasin.
 * Bu fayl app.tayyorr.uz, plus va smm-app da bir xil.
 */

export type MascotPose =
  | "onboard-1"
  | "onboard-2"
  | "onboard-3"
  | "no-internet"
  | "empty-orders"
  | "empty-feed"
  | "empty-offers"
  | "empty-discounts"
  | "no-results"
  | "error"
  | "maintenance"
  | "update"
  | "welcome"
  | "goodbye"
  | "success"
  | "wallet-empty"
  | "not-found";

const CSS = `
@keyframes mascot-in { from { opacity: 0; transform: translateY(16px) scale(.85) } to { opacity: 1; transform: none } }
@keyframes mascot-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
.mascot-in { animation: mascot-in .65s cubic-bezier(.2,.9,.3,1.25) both }
.mascot-float { animation: mascot-float 3.2s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { .mascot-in, .mascot-float { animation: none } }
`;

export function Mascot({
  pose,
  size = 200,
  float = true,
  className = "",
  priority = false,
}: {
  pose: MascotPose;
  size?: number;
  float?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`mascot-in inline-block ${className}`} style={{ width: size, height: size }}>
      <style>{CSS}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/mascot/${pose}.webp`}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className={`h-full w-full select-none object-contain ${float ? "mascot-float" : ""}`}
      />
    </span>
  );
}

/** Böş / xato holatlari uçun yagona blok: maskot, sarlavha, izoh va tugmalar (children). */
export function MascotState({
  pose,
  title,
  message,
  children,
  size = 190,
  className = "",
}: {
  pose: MascotPose;
  title: string;
  message?: React.ReactNode;
  children?: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-8 text-center ${className}`}>
      <Mascot pose={pose} size={size} />
      <h3 className="mt-3 text-lg font-bold leading-snug" style={{ color: "inherit" }}>
        {title}
      </h3>
      {message && <p className="mt-1.5 max-w-sm text-sm leading-relaxed opacity-70">{message}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
