/**
 * So'rov yuborish — hech qachon cheksiz "aylanib" qolmaydi: vaqt chegarasi
 * (standart 25 s) va tushunarli xato matnlari (internet yo'q, server javob
 * bermadi, server HTML qaytardi va h.k.).
 */
export class RequestError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

export const NETWORK_ERROR =
  "Internet aloqasi yöq yoki server bilan bog'lanib bölmadi. Qayta urinib köring.";
export const TIMEOUT_ERROR =
  "Server javob bermadi (vaqt tugadi). Internetni tekşirib, qayta urinib köring.";

export async function fetchJson<T = Record<string, unknown>>(
  url: string,
  init: RequestInit & { json?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const { json, timeoutMs = 25_000, headers, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof DOMException && e.name === "AbortError") throw new RequestError(TIMEOUT_ERROR);
    throw new RequestError(NETWORK_ERROR);
  }
  clearTimeout(timer);
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    const msg =
      (data && typeof data.error === "string" && data.error) ||
      (res.status === 401
        ? "Sessiya tugagan — qayta kiring."
        : res.status === 403
          ? "Bu amal uçun ruxsat yöq."
          : res.status === 404
            ? "Topilmadi (öçirilgan bölişi mumkin)."
            : res.status === 429
              ? "Juda köp urinish — birozdan söng qayta urinib köring."
              : res.status >= 500
                ? "Serverda xatolik yuz berdi. Birozdan söng qayta urinib köring."
                : "Xatolik yuz berdi.");
    throw new RequestError(msg, res.status);
  }
  return (data ?? ({} as T)) as T;
}

export const errorText = (e: unknown) =>
  e instanceof Error && e.message ? e.message : "Xatolik yuz berdi.";
