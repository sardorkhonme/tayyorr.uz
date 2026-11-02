/*
 * tayyorr.uz logotipi: rangli "T" belgisi + yozuv (yozuv mavzuga qarab almashadi).
 * Belgi yozuvdan ~1.5 baravar baland — markClassName bilan beriladi.
 */
export function Logo({
  className = "h-7",
  markClassName = "h-10",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className="inline-flex max-w-full select-none items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden
        className={`w-auto shrink-0 object-contain ${markClassName}`}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.png"
        alt="tayyorr.uz"
        className={`logo-dark w-auto min-w-0 max-w-full object-contain ${className}`}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-light.png"
        alt="tayyorr.uz"
        className={`logo-light w-auto min-w-0 max-w-full object-contain ${className}`}
        draggable={false}
      />
    </span>
  );
}
