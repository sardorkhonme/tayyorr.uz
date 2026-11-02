import { TERMS, TERMS_INTRO, TERMS_VERSION } from "@/lib/terms";

/** Ommaviy oferta matnini bir xil ko'rinishda chizadi (modal ham, sahifa ham). */
export function TermsContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "text-sm" : "text-sm sm:text-[0.95rem]"}>
      <p className="text-zinc-400">{TERMS_INTRO}</p>
      <div className="mt-4 flex flex-col gap-4">
        {TERMS.map((s) => (
          <section key={s.title}>
            <h3 className="font-semibold text-white">{s.title}</h3>
            {s.body && (
              <p className="mt-1 leading-relaxed text-zinc-300">{s.body}</p>
            )}
            {s.points && (
              <ul className="mt-1.5 flex flex-col gap-1 text-zinc-300">
                {s.points.map((p, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="mt-5 text-xs text-zinc-500">
        Versiya: {TERMS_VERSION}
      </p>
    </div>
  );
}
