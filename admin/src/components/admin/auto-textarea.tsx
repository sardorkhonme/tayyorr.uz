"use client";

import { useLayoutEffect, useRef } from "react";

/** Matn qatoriga qarab kengayadigan textarea (maxRows qatorgacha). */
export function AutoTextarea({
  value,
  maxRows = 5,
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  maxRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 20;
    const pad =
      parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) +
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const max = line * maxRows + pad;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [value, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      className={`resize-none ${className}`}
      {...rest}
    />
  );
}
