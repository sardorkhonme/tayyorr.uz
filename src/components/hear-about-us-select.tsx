"use client";

import type { ReactNode } from "react";

export type HearAboutUsValue =
  | ""
  | "instagram"
  | "telegram"
  | "ai"
  | "google"
  | "friend"
  | "other";

export function InstagramLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="ig-grad-real" cx="20%" cy="100%" r="150%">
          <stop offset="0%" stopColor="#ffd600" />
          <stop offset="25%" stopColor="#ff0140" />
          <stop offset="50%" stopColor="#d800b9" />
          <stop offset="75%" stopColor="#7000ff" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6.5" fill="url(#ig-grad-real)" />
      <rect x="4.5" y="4.5" width="15" height="15" rx="4" stroke="#fff" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.7" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16.8" cy="7.2" r="1.1" fill="#fff" />
    </svg>
  );
}

export function TelegramLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        d="M5.2 11.8l12.4-4.8c.6-.2 1.1.2.9.8l-2.1 9.9c-.2.7-.6.8-1.2.5l-3.4-2.5-1.6 1.6c-.2.2-.4.3-.8.3l.2-3.5 6.4-5.8c.3-.3 0-.4-.4-.2l-7.9 5-3.4-1.1c-.7-.2-.7-.7.1-.9z"
        fill="#fff"
      />
    </svg>
  );
}

export function AiLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <linearGradient id="ai-grad-spark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="45%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6.5" fill="#181824" />
      <path
        d="M12 4L13.8 8.7L18.5 10.5L13.8 12.3L12 17L10.2 12.3L5.5 10.5L10.2 8.7L12 4Z"
        fill="url(#ai-grad-spark)"
      />
      <path
        d="M17.5 15L18.3 17.2L20.5 18L18.3 18.8L17.5 21L16.7 18.8L14.5 18L16.7 17.2L17.5 15Z"
        fill="url(#ai-grad-spark)"
      />
      <path
        d="M6 3.5L6.6 5L8 5.6L6.6 6.2L6 7.7L5.4 6.2L4 5.6L5.4 5L6 3.5Z"
        fill="url(#ai-grad-spark)"
      />
    </svg>
  );
}

export function GoogleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export function FriendLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="6.5" fill="#0D9488" />
      <circle cx="9" cy="8" r="3.2" fill="#fff" />
      <path d="M3.5 17c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5v1h-11v-1z" fill="#fff" />
      <circle cx="16.5" cy="9" r="2.5" fill="#E6FFFA" />
      <path d="M14.5 15c1.5 0 3.8.8 4.2 2.5v.5h-3.2l-.3-1c-.2-.7-.4-1.4-.7-2z" fill="#E6FFFA" />
    </svg>
  );
}

export function OtherLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="6.5" fill="#6366F1" />
      <path
        d="M12 6.5C8.4 6.5 5.5 8.8 5.5 11.6c0 1.6.9 3.1 2.4 4.1l-.6 2.6 2.8-1.4c.6.2 1.3.2 1.9.2 3.6 0 6.5-2.3 6.5-5.1S15.6 6.5 12 6.5z"
        fill="#fff"
      />
      <circle cx="9.5" cy="11.5" r="1" fill="#6366F1" />
      <circle cx="12" cy="11.5" r="1" fill="#6366F1" />
      <circle cx="14.5" cy="11.5" r="1" fill="#6366F1" />
    </svg>
  );
}

export const HEAR_OPTIONS: {
  value: Exclude<HearAboutUsValue, "">;
  label: string;
  icon: () => ReactNode;
}[] = [
  { value: "instagram", label: "Instagram", icon: () => <InstagramLogo /> },
  { value: "telegram", label: "Telegram", icon: () => <TelegramLogo /> },
  { value: "ai", label: "Suniy intellekt tavsiyasi", icon: () => <AiLogo /> },
  { value: "google", label: "Google", icon: () => <GoogleLogo /> },
  { value: "friend", label: "Do'stimdan", icon: () => <FriendLogo /> },
  { value: "other", label: "Boshqa", icon: () => <OtherLogo /> },
];

export function ChannelBrandIcon({
  name,
  className = "h-4 w-4",
}: {
  name: string;
  className?: string;
}) {
  switch (name) {
    case "instagram":
      return <InstagramLogo className={className} />;
    case "telegram":
      return <TelegramLogo className={className} />;
    case "ai":
      return <AiLogo className={className} />;
    case "google":
      return <GoogleLogo className={className} />;
    case "friend":
      return <FriendLogo className={className} />;
    case "other":
      return <OtherLogo className={className} />;
    default:
      return <OtherLogo className={className} />;
  }
}

export function HearAboutUsSelect({
  value,
  onChange,
  detail = "",
  onDetailChange,
}: {
  value: HearAboutUsValue;
  onChange: (v: HearAboutUsValue) => void;
  detail?: string;
  onDetailChange?: (d: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {HEAR_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                active
                  ? "border-indigo-400/80 bg-indigo-500/15 shadow-[0_0_15px_rgba(99,102,241,0.2)] ring-1 ring-indigo-400"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <div className="shrink-0">{opt.icon()}</div>
              <span className={`text-sm font-medium ${active ? "text-white" : "text-zinc-300"}`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {value === "other" && onDetailChange && (
        <div className="animate-fade-in mt-1">
          <label className="mb-1 block text-xs text-zinc-400">
            Qayerdan eshitganingizni yozing:
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={detail}
            onChange={(e) => onDetailChange(e.target.value)}
            placeholder="Masalan: YouTube, TikTok, universitetda, ko'cha banneridan..."
            className="input w-full text-sm"
            autoFocus
          />
        </div>
      )}
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
