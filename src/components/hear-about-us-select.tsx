"use client";

export type HearAboutUsValue =
  | ""
  | "instagram"
  | "telegram"
  | "ai"
  | "google"
  | "friend"
  | "other";

const OPTIONS: { value: HearAboutUsValue; label: string; icon: string }[] = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "telegram", label: "Telegram", icon: "✈️" },
  { value: "ai", label: "Suniy intellekt tavsiyasi", icon: "🤖" },
  { value: "google", label: "Google", icon: "🔍" },
  { value: "friend", label: "Do'stimdan", icon: "👥" },
  { value: "other", label: "Boshqa", icon: "💬" },
];

export function HearAboutUsSelect({
  value,
  onChange,
}: {
  value: HearAboutUsValue;
  onChange: (v: HearAboutUsValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              active
                ? "border-indigo-400/70 bg-indigo-500/10 text-white"
                : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
            }`}
          >
            <span className="text-base">{opt.icon}</span>
            <span className="font-medium">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** hearAboutUs qiymati uchun o'zbek tilidagi tavsif. */
export const HEAR_ABOUT_US_LABELS: Record<string, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  ai: "Suniy intellekt tavsiyasi",
  google: "Google",
  friend: "Do'stimdan",
  other: "Boshqa",
};

