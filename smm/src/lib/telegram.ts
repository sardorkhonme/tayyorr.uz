/**
 * tayyorr.uz admin log guruhiga xabar (o'sha bot va guruh).
 * Topik: TELEGRAM_TOPIC_SMM, bo'lmasa TELEGRAM_TOPIC_PAYMENTS.
 * Xato bo'lsa jim o'tkaziladi — sayt ishiga xalaqit bermaydi.
 */
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifyAdmins(title: string, lines: string[] = [], url?: { text: string; href: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LOG_GROUP_ID;
  if (!token || !chatId) return false;
  const thread = process.env.TELEGRAM_TOPIC_SMM || process.env.TELEGRAM_TOPIC_PAYMENTS;

  const text = `<b>${esc(title)}</b>` + (lines.length ? `\n\n${lines.map(esc).join("\n")}` : "");
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        ...(thread ? { message_thread_id: Number(thread) } : {}),
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(url ? { reply_markup: { inline_keyboard: [[{ text: url.text, url: url.href }]] } } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
