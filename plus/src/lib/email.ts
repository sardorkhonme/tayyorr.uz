/**
 * Email yuborish — Brevo (avvalgi Sendinblue) tranzaksion API.
 * Env: BREVO_API_KEY (majburiy), EMAIL_FROM (standart: noreply@tayyorr.uz),
 * EMAIL_FROM_NAME (standart: Tayyorr). Jo'natuvchi manzil Brevo'da tasdiqlangan
 * domenda bo'lishi kerak.
 */
export function emailConfigured() {
  return !!process.env.BREVO_API_KEY;
}

/** EMAIL_FROM ga manzil o'rniga nom yozilgan bo'lsa ham ishlasin (masalan "Tayyorr.uz"). */
function sender() {
  const from = (process.env.EMAIL_FROM || "").trim();
  const name = (process.env.EMAIL_FROM_NAME || "").trim();
  const isEmail = /^[^\s@]+@[^\s@]+$/.test(from);
  return {
    email: isEmail ? from : "noreply@tayyorr.uz",
    name: name || (!isEmail && from) || "Tayyorr",
  };
}

export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY yo'q");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: sender(),
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      textContent: opts.text,
      tags: ["otp"],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 300)}`);
  }
}

const LOGO_URL = "https://tayyorr.uz/logo-mark.png";
const PLUS_URL = (process.env.NEXT_PUBLIC_PLUS_URL || "https://plus.tayyorr.uz").replace(/\/+$/, "");
const COPY_ICON_URL = `${PLUS_URL}/email/copy.png`;

/** Barcha xatlar uchun umumiy oddiy ramka: logo + oq karta. */
function layout(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f9;padding:32px 12px;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:440px;background:#ffffff;border-radius:20px;padding:32px 28px" cellspacing="0" cellpadding="0">
<tr><td><table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="vertical-align:middle"><img src="${LOGO_URL}" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px"></td>
<td style="vertical-align:middle;padding-left:10px;font-size:22px;font-weight:700;color:#18181b">Tayyorr</td>
</tr></table></td></tr>
${inner}
</table></td></tr></table></body></html>`;
}

/**
 * Tasdiqlash kodi xati. 4 ta raqam katagi + 5-binafsha katak (nusxa olish belgisi).
 * Xatda JavaScript ishlamaydi — belgi bosilganda kod sahifasi kod yozilgan holda ochiladi.
 */
export function otpEmail(code: string, email: string) {
  const fillUrl = `${PLUS_URL}/register/code?email=${encodeURIComponent(email)}&code=${code}`;
  const cell = "width:52px;height:60px;border-radius:12px;text-align:center;font-family:Arial,sans-serif";
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="${cell};background:#f4f4ff;border:1px solid #e0e0ff;font-size:30px;font-weight:700;color:#3730a3">${d}</td>`,
    )
    .join('<td style="width:10px"></td>');
  const copyCell = `<td style="width:10px"></td><td style="${cell};background:#6d28d9;border:1px solid #6d28d9"><a href="${fillUrl}" title="Nusxa oliş" style="display:block;line-height:60px;text-decoration:none"><img src="${COPY_ICON_URL}" width="24" height="24" alt="Nusxa" style="display:inline-block;vertical-align:middle;border:0;width:24px;height:24px"></a></td>`;
  const html = layout(`
<tr><td style="padding-top:18px;font-size:16px;color:#3f3f46;line-height:1.5">Röyxatdan ötiş uçun tasdiqlaş kodingiz:</td></tr>
<tr><td style="padding:22px 0" align="center"><table role="presentation" cellspacing="0" cellpadding="0"><tr>${digits}${copyCell}</tr></table></td></tr>
<tr><td style="font-size:14px;color:#71717a;line-height:1.5">Kod 10 daqiqa amal qiladi. Uni heç kimga aytmang — Tayyorr xodimlari heç qaçon kodni söraşmaydi.</td></tr>
<tr><td style="padding-top:18px;font-size:13px;color:#a1a1aa;line-height:1.5">Agar siz söramagan bölsangiz, bu xatni şunçaki öçirib taşlang.</td></tr>`);
  const text = `Tayyorr — tasdiqlaş kodingiz: ${code}\n\nKod 10 daqiqa amal qiladi. Uni heç kimga aytmang.\nAgar siz söramagan bölsangiz, bu xatni öçirib taşlang.`;
  return { subject: `${code} — Tayyorr tasdiqlaş kodi`, html, text };
}

/** Parolni tiklash xati — "Parolni yangilaş" tugmasi plus'dagi yangi parol sahifasiga olib boradi. */
export function resetEmail(url: string) {
  const html = layout(`
<tr><td style="padding-top:20px;font-size:20px;font-weight:700;color:#18181b;line-height:1.3">Parolingizni unutdingizmi?</td></tr>
<tr><td style="padding-top:10px;font-size:15px;color:#3f3f46;line-height:1.6">Heç qisi yöq — quyidagi tugmani bosing va yangi parol öylab toping.</td></tr>
<tr><td style="padding:24px 0" align="center">
<a href="${url}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 30px;border-radius:12px">Parolni yangilaş</a>
</td></tr>
<tr><td style="font-size:14px;color:#71717a;line-height:1.5">Havola 30 daqiqa amal qiladi va faqat bir marta işlaydi.</td></tr>
<tr><td style="padding-top:18px;font-size:13px;color:#a1a1aa;line-height:1.5">Agar parolni tiklaşni siz söramagan bölsangiz, bu xatni şunçaki öçirib taşlang — parolingiz özgarmaydi.</td></tr>`);
  const text = `Tayyorr — parolingizni unutdingizmi?\n\nYangi parol öylab topiş uçun havola (30 daqiqa amal qiladi):\n${url}\n\nAgar siz söramagan bölsangiz, bu xatni öçirib taşlang — parolingiz özgarmaydi.`;
  return { subject: "Parolni yangilaş — Tayyorr", html, text };
}
