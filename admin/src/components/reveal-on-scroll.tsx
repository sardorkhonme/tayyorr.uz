"use client";

import { useEffect } from "react";

/**
 * `.blur-in` elementlarni ekranga kirganда ketma-ket (silliq) ochadi.
 * `html.js-reveal` sinfini qo'shadi — CSS shu holatda elementlarni yashiradi.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-reveal");

    let queue: HTMLElement[] = [];
    let flushT: number | null = null;

    const flush = () => {
      queue
        .sort(
          (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        )
        .forEach((el, i) => {
          el.style.setProperty("--rd", `${Math.min(i, 10) * 70}ms`);
          el.classList.add("reveal-in");
        });
      queue = [];
      flushT = null;
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            queue.push(e.target as HTMLElement);
            io.unobserve(e.target);
          }
        }
        if (queue.length && flushT == null) {
          flushT = window.setTimeout(flush, 40);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );

    const observeAll = () => {
      document
        .querySelectorAll<HTMLElement>(".blur-in:not(.reveal-in)")
        .forEach((el) => io.observe(el));
    };
    observeAll();

    // yangi elementlar (yangi xabar, ro'yxat yangilanishi) uchun
    let moT: number | null = null;
    const mo = new MutationObserver(() => {
      if (moT != null) return;
      moT = window.setTimeout(() => {
        moT = null;
        observeAll();
      }, 120);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // xavfsizlik to'ri: 6s dan keyin qolgani ko'rsatilsin
    const safety = window.setTimeout(() => {
      document
        .querySelectorAll(".blur-in:not(.reveal-in)")
        .forEach((el) => el.classList.add("reveal-in"));
    }, 6000);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(safety);
      if (flushT) window.clearTimeout(flushT);
      if (moT) window.clearTimeout(moT);
    };
  }, []);

  return null;
}
