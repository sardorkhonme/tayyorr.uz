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

/**
 * Tasdiqlash kodi xati — oddiy, har qanday pochta dasturida to'g'ri ko'rinadi.
 * Xatda JavaScript ishlamaydi, shuning uchun "nusxalash" o'rniga: tugma kod sahifasini
 * kod yozilgan holda ochadi + kod bitta qatorda ham (bosib turib nusxalash uchun).
 */
export function otpEmail(code: string, email: string) {
  const fillUrl = `${PLUS_URL}/register/code?email=${encodeURIComponent(email)}&code=${code}`;
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="width:52px;height:60px;background:#f4f4ff;border:1px solid #e0e0ff;border-radius:12px;font-size:30px;font-weight:700;color:#3730a3;text-align:center;font-family:Arial,sans-serif">${d}</td>`,
    )
    .join('<td style="width:10px"></td>');
  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f9;padding:32px 12px;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:440px;background:#ffffff;border-radius:20px;padding:32px 28px" cellspacing="0" cellpadding="0">
<tr><td><table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="vertical-align:middle"><img src="${LOGO_URL}" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px"></td>
<td style="vertical-align:middle;padding-left:10px;font-size:22px;font-weight:700;color:#18181b">Tayyorr</td>
</tr></table></td></tr>
<tr><td style="padding-top:18px;font-size:16px;color:#3f3f46;line-height:1.5">Röyxatdan ötiş uçun tasdiqlaş kodingiz:</td></tr>
<tr><td style="padding:22px 0 10px" align="center"><table role="presentation" cellspacing="0" cellpadding="0"><tr>${digits}</tr></table></td></tr>
<tr><td align="center" style="padding-bottom:20px;font-size:13px;color:#a1a1aa">Nusxalaş uçun: <span style="font-size:15px;font-weight:700;color:#3730a3;letter-spacing:1px;-webkit-user-select:all;user-select:all">${code}</span></td></tr>
<tr><td align="center" style="padding-bottom:22px">
<a href="${fillUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 26px;border-radius:12px">Kodni kiritiş →</a>
</td></tr>
<tr><td style="font-size:14px;color:#71717a;line-height:1.5">Kod 10 daqiqa amal qiladi. Uni heç kimga aytmang — Tayyorr xodimlari heç qaçon kodni söraşmaydi.</td></tr>
<tr><td style="padding-top:18px;font-size:13px;color:#a1a1aa;line-height:1.5">Agar siz söramagan bölsangiz, bu xatni şunçaki öçirib taşlang.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Tayyorr — tasdiqlaş kodingiz: ${code}\n\nKodni kiritiş: ${fillUrl}\n\nKod 10 daqiqa amal qiladi. Uni heç kimga aytmang.\nAgar siz söramagan bölsangiz, bu xatni öçirib taşlang.`;
  return { subject: `${code} — Tayyorr tasdiqlaş kodi`, html, text };
}
