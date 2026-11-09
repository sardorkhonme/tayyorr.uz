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
const SITE = "https://tayyorr.uz";
const SUPPORT = "https://plus.tayyorr.uz/support";

/**
 * Tasdiqlash kodi xati — pochta dasturlari (Gmail, Outlook, iPhone Mail) uchun
 * xavfsiz: jadval asosida, hamma uslub inline, gradient o'rnida zaxira rang bor.
 */
export function otpEmail(code: string) {
  const year = new Date().getFullYear();
  const html = `<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Tayyorr tasdiqlaş kodi</title></head>
<body style="margin:0;padding:0;background:#f1f1f7;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Kodingiz: ${code} — 10 daqiqa amal qiladi.&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f1f7">
<tr><td align="center" style="padding:36px 14px">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px">
  <!-- logo -->
  <tr><td align="center" style="padding-bottom:22px">
    <a href="${SITE}" style="text-decoration:none">
      <table role="presentation" cellspacing="0" cellpadding="0"><tr>
        <td style="vertical-align:middle"><img src="${LOGO_URL}" width="40" height="40" alt="Tayyorr" style="display:block;border:0;width:40px;height:40px"></td>
        <td style="vertical-align:middle;padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px">Tayyorr</td>
      </tr></table>
    </a>
  </td></tr>

  <!-- karta -->
  <tr><td style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(79,70,229,0.10)">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:#6366f1;background-image:linear-gradient(90deg,#3b82f6,#6366f1,#a855f7)">&nbsp;</td></tr>
      <tr><td style="padding:34px 32px 8px;font-family:Arial,Helvetica,sans-serif">
        <div style="font-size:24px;font-weight:700;color:#18181b;line-height:1.3">Tasdiqlaş kodingiz</div>
        <div style="padding-top:10px;font-size:15px;color:#52525b;line-height:1.6">Röyxatdan ötişni yakunlaş uçun quyidagi kodni saytdagi maydonga kiriting.</div>
      </td></tr>

      <!-- kod -->
      <tr><td align="center" style="padding:22px 32px 6px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ff;border:1px dashed #c7c2fb;border-radius:18px">
          <tr><td align="center" style="padding:22px 10px 6px;font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:42px;font-weight:700;letter-spacing:14px;color:#4338ca;line-height:1">${code}</td></tr>
          <tr><td align="center" style="padding:6px 10px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6d6a9c">⏱ 10 daqiqa amal qiladi</td></tr>
        </table>
      </td></tr>

      <!-- xavfsizlik -->
      <tr><td style="padding:20px 32px 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffbeb;border-radius:14px">
          <tr><td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#92400e;line-height:1.55">
            🔒 <b>Kodni heç kimga aytmang.</b> Tayyorr xodimlari heç qaçon kodni söraşmaydi — telefon, Telegram yoki boşqa joyda ham.
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:22px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a1a1aa;line-height:1.6">
        Siz söramagan bölsangiz, bu xatni şunçaki öçirib taşlang — hisobingiz xavfsiz.
      </td></tr>
    </table>
  </td></tr>

  <!-- footer -->
  <tr><td align="center" style="padding:24px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;line-height:1.7">
    <a href="${SITE}" style="color:#6366f1;text-decoration:none;font-weight:600">tayyorr.uz</a>
    &nbsp;·&nbsp;
    <a href="${SUPPORT}" style="color:#6366f1;text-decoration:none">Yordam</a><br>
    Prezentatsiya, referat va kurs işlari — bir joyda.<br>
    © ${year} Tayyorr. Bu xat avtomatik yuborildi, unga javob yozmang.
  </td></tr>
</table>

</td></tr></table>
</body></html>`;
  const text = `Tayyorr — tasdiqlaş kodingiz: ${code}\n\nKod 10 daqiqa amal qiladi. Uni heç kimga aytmang — Tayyorr xodimlari heç qaçon kodni söraşmaydi.\nSiz söramagan bölsangiz, bu xatni öçirib taşlang.\n\ntayyorr.uz`;
  return { subject: `${code} — Tayyorr tasdiqlaş kodi`, html, text };
}
