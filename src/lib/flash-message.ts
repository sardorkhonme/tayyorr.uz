/**
 * Asl xabarga o'tib, uni "lip-lip" yoritadi — mobil ilovadagidek: avval aylantirish,
 * xabar ekranda bo'lmasa aylantirish tugagach yonadi.
 */
export function flashMessage(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const inView = r.top >= 0 && r.bottom <= window.innerHeight;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const start = () => {
    el.classList.remove("msg-flash");
    void el.offsetWidth; // animatsiya qayta boshlansin
    el.classList.add("msg-flash");
    setTimeout(() => el.classList.remove("msg-flash"), 1500);
  };
  if (inView) start();
  else setTimeout(start, 450);
}
