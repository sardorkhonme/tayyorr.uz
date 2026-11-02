// Klient-xavfsiz: User-Agent satridan o'qiladigan "brauzer · qurilma" nomi
// hosil qiladi. To'liq UA-parser kutubxonasiz — eng ko'p uchraydigan
// holatlarni qamrab oladi (aniq bo'lmasa xom UA qaytariladi).

function detectOs(ua: string): string {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "";
}

function detectBrowser(ua: string): string {
  if (/EdgA|EdgiOS|Edge|Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/YaBrowser/i.test(ua)) return "Yandex";
  if (/CriOS|Chrome/i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/FxiOS|Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua) && !/Chrome|CriOS|Chromium/i.test(ua)) return "Safari";
  return "";
}

/** "Chrome · Windows" ko'rinishida qisqa, o'qiladigan qurilma nomi. */
export function describeDevice(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent);
  if (!browser && !os) return null;
  return [browser, os].filter(Boolean).join(" · ");
}
