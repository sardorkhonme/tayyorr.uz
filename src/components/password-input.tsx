"use client";

import { useState } from "react";

import { EyeIcon } from "@/components/icons";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & { className?: string };

/** Parol maydoni — ko'z tugmasi bilan ochib/yashirib ko'rish. */
export function PasswordInput({ className = "input", ...rest }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...rest}
        type={show ? "text" : "password"}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Yaşiriş" : "Körsatiş"}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
      >
        <EyeIcon off={show} />
      </button>
    </div>
  );
}
