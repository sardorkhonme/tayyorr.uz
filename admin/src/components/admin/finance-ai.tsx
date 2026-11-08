"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";

/** "AI tushuntirsin" tugmasi va natija — faqat bosilganda so'raladi (bepul limit tejaladi). */
export function FinanceAiPanel({
  query,
  enabled,
  summary,
  at,
  model,
}: {
  query: string;
  enabled: boolean;
  summary: string | null;
  at: string | null;
  model: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/finance/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "AI javob bermadi");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <p className="rounded-lg px-3 py-3 text-sm leading-relaxed" style={{ background: "var(--viz-grid)", color: "var(--viz-muted)" }}>
        AI ulanmagan. Google AI Studio (aistudio.google.com) da bepul API kalit oling va admin loyihasining Vercel sozlamalariga{" "}
        <code className="rounded px-1" style={{ background: "var(--viz-surface)", color: "var(--viz-text)" }}>
          GEMINI_API_KEY
        </code>{" "}
        nomi bilan qöşing — şundan keyin şu yerda tugma paydo böladi.
      </p>
    );
  }

  const lines = (summary ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const when = at ? new Date(at).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 ? (
        <div className="space-y-2 text-[15px] leading-relaxed" style={{ color: "var(--viz-text)" }}>
          {lines.map((l, i) =>
            /^[-•*]\s/.test(l) ? (
              <p key={i} className="flex gap-2">
                <span style={{ color: "var(--viz-1)" }}>•</span>
                <span>{l.replace(/^[-•*]\s+/, "")}</span>
              </p>
            ) : (
              <p key={i}>{l}</p>
            ),
          )}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--viz-muted)" }}>
          Tugmani bosing — AI şu davrdagi raqamlarni oddiy tilda tuşuntirib beradi. Har bir «!» içida ham AI izohi paydo böladi.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          style={{ background: "var(--viz-1)" }}
        >
          <Icon name="sparkles" className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
          {busy ? "AI öylayapti…" : lines.length ? "Qayta tahlil qiliş" : "AI tuşuntirsin"}
        </button>
        {when && (
          <span className="text-xs" style={{ color: "var(--viz-muted)" }}>
            {when} · {model}
          </span>
        )}
        {error && <span className="text-xs text-red-300">{error}</span>}
      </div>
      <p className="text-[11px]" style={{ color: "var(--viz-muted)" }}>
        AI ga faqat umumiy raqamlar yuboriladi (ism, telefon, karta yöq). AI xato qiliși mumkin — muhim qarorlardan oldin raqamlarni tekşiring.
      </p>
    </div>
  );
}
