/** tayyorr+ logotipi: rangli "T+" belgisi + "tayyorr+" yozuvi. */
export function Logo({
  className = "text-xl",
  markClassName = "h-[1.5em]",
  light = false,
}: {
  className?: string;
  markClassName?: string;
  /** rangli fon ustida — yozuv oq */
  light?: boolean;
}) {
  return (
    <span
      className={`inline-flex select-none items-center gap-[0.35em] font-display font-bold tracking-tight ${
        light ? "text-white" : "text-zinc-900"
      } ${className}`}
    >
      {light ? (
        // rangli fonda belgi oq kartochka ichida turadi — ranglari yo'qolib ketmaydi
        <span className="grid h-[1.6em] w-[1.6em] shrink-0 place-items-center rounded-[0.45em] bg-[#ffffff] shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/plus-mark.png" alt="" aria-hidden className="h-[1.3em] w-auto" draggable={false} />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/plus-mark.png" alt="" aria-hidden className={`w-auto shrink-0 ${markClassName}`} draggable={false} />
      )}
      <span>
        tayyorr
        {light ? (
          <span className="text-amber-300">+</span>
        ) : (
          <span className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">+</span>
        )}
      </span>
    </span>
  );
}
