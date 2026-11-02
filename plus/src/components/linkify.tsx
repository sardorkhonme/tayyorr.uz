/** Matndagi havolalarni (https://… yoki tayyorr.uz/…) bosiladigan qiladi. */
const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+|\b(?:plus\.|smm\.)?tayyorr\.uz(?:\/[^\s<]*)?)/gi;

export function Linkify({ text, mine }: { text: string; mine?: boolean }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        // oxiridagi tinish belgilarini havoladan chiqaramiz
        const m = /^(.*?)([.,!?:;)]*)$/.exec(part)!;
        const label = m[1];
        const href = /^https?:\/\//i.test(label) ? label : `https://${label}`;
        // tayyorr+ ning o'z havolalari (eski smm. manzili ham) — shu oynada
        const internal = /^https?:\/\/(plus|smm)\.tayyorr\.uz/i.test(href);
        return (
          <span key={i}>
            <a
              href={href}
              {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              className={`break-all font-medium underline underline-offset-2 ${
                mine ? "text-white decoration-white/60" : "text-indigo-600 decoration-indigo-300 hover:text-indigo-800"
              }`}
            >
              {label}
            </a>
            {m[2]}
          </span>
        );
      })}
    </>
  );
}
