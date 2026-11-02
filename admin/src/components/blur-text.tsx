"use client";

import { Fragment, useEffect, useRef, useState } from "react";

/**
 * Matnni harfma-harf blur bilan ochadi. Prop o'zgarsa: eski matn
 * harfma-harf yo'qoladi, keyin yangisi harfma-harf paydo bo'ladi.
 * Animatsiya tugagach oddiy matnga o'tadi — matn hech qachon qiyshaymaydi.
 */
export function BlurText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [shown, setShown] = useState(text);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [settled, setSettled] = useState(false);
  const [round, setRound] = useState(0);
  const prev = useRef(text);

  const stagger = shown.length > 40 ? 12 : 24;

  // matn o'zgarsa: chiqib ket -> yangisini qo'y -> kir
  useEffect(() => {
    if (text === prev.current) return;
    prev.current = text;
    setSettled(false);
    setPhase("out");
    const len = shown.length || 1;
    const st = len > 40 ? 12 : 24;
    const wait = Math.min(320 + len * st, 900);
    const id = setTimeout(() => {
      setShown(text);
      setPhase("in");
      setRound((r) => r + 1);
    }, wait);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // "in" animatsiyasi tugagach oddiy matnga o'tamiz
  useEffect(() => {
    if (phase !== "in") return;
    const total = shown.length * stagger + 450;
    const id = setTimeout(() => setSettled(true), total);
    return () => clearTimeout(id);
  }, [phase, shown, stagger]);

  if (settled && phase === "in") {
    return <span className={className}>{shown}</span>;
  }

  const words = shown.split(" ");
  let idx = 0;

  return (
    <span className={className} aria-label={shown}>
      {words.map((w, wi) => {
        const chars = [...w];
        return (
          <Fragment key={`${round}:${phase}:${wi}`}>
            <span className="inline-block" aria-hidden>
              {chars.map((c, ci) => {
                const delay = idx++ * stagger;
                return (
                  <span
                    key={ci}
                    className={`blur-char ${phase}`}
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    {c}
                  </span>
                );
              })}
            </span>
            {wi < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </span>
  );
}
