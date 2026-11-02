import crypto from "crypto";

/**
 * Click "Merchant API" — Prepare/Complete webhook'dan farqli, bu bizning
 * tomondan Click'ga so'rov yuboradigan API (to'lov holatini tekshirish,
 * to'lovni bekor qilish/qaytarish va h.k.).
 * Hujjat: docs.click.uz — "Savdogar APIsi" (Merchant API).
 *
 * Autentifikatsiya boshqacha: alohida CLICK_MERCHANT_USER_ID kerak, va
 * har bir so'rovda "Auth: merchant_user_id:digest:timestamp" sarlavhasi
 * yuboriladi (digest = sha1(timestamp + secret_key)).
 */
const BASE = "https://api.click.uz/v2/merchant";
const MERCHANT_USER_ID = process.env.CLICK_MERCHANT_USER_ID || "";
const SECRET_KEY = process.env.CLICK_MERCHANT_API_SECRET || process.env.CLICK_SECRET_KEY || "";
const SERVICE_ID = process.env.CLICK_SERVICE_ID || "";

export function clickMerchantApiConfigured(): boolean {
  return !!(MERCHANT_USER_ID && SECRET_KEY && SERVICE_ID);
}

function authHeader(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto
    .createHash("sha1")
    .update(`${timestamp}${SECRET_KEY}`)
    .digest("hex");
  return `${MERCHANT_USER_ID}:${digest}:${timestamp}`;
}

interface ClickApiResult {
  ok: boolean;
  status: number;
  data: {
    error_code?: number;
    error_note?: string;
    [key: string]: unknown;
  };
}

async function clickApi(method: string, path: string): Promise<ClickApiResult> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Auth: authHeader(),
    },
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** merchant_trans_id (bizning WalletTransaction ID) orqali Click'dagi to'lov holatini tekshiradi. */
export async function checkClickPaymentStatus(merchantTransId: string, paidOn: Date) {
  return clickApi(
    "GET",
    `/payment/status_by_mti/${SERVICE_ID}/${merchantTransId}/${ymd(paidOn)}`,
  );
}

/** Click orqali to'langan summani bekor qiladi/qaytaradi. paymentId = status tekshiruvidan olingan Click "payment_id". */
export async function reverseClickPayment(paymentId: string) {
  return clickApi("DELETE", `/payment/reversal/${SERVICE_ID}/${paymentId}`);
}

/** Fiskal chek havolasini (OFD QR kod) oladi — agar shu to'lov uchun fiskal ma'lumot topshirilgan bo'lsa. */
export async function getClickOfdData(paymentId: string) {
  return clickApi("GET", `/payment/ofd_data/${SERVICE_ID}/${paymentId}`);
}
