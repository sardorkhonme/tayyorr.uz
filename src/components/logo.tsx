/*
 * tayyorr.uz logotipi: rangli "T" belgisi + "Tayyorr.uz" yozuvi (asosiy shrift — Space Grotesk).
 * className — yozuv o'lchami (text-*), markClassName — belgi balandligi.
 */
export function Logo({
  className = "text-2xl",
  markClassName = "h-9",
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
      <span className={`whitespace-nowrap font-display font-bold leading-tight tracking-tight text-white ${className}`}>
        Tayyorr<span className="text-indigo-400">.uz</span>
      </span>
    </span>
  );
}
