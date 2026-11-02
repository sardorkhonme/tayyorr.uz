import { db } from "@/lib/db";
import { num } from "@/lib/format";
import { fetchBalance, providerConfigured } from "@/lib/provider";
import { notifyAdmins } from "@/lib/telegram";

/** Ogohlantirish chegaralari (so'm) — balans shulardan pastga tushganda bir martadan xabar. */
const THRESHOLDS = [100_000, 50_000, 40_000, 30_000, 20_000, 10_000];
/** Oxirgi xabar berilgan chegara (bo'lmasa — balans normal). */
const KEY = "smmProviderAlertLevel";
const ADD_FUNDS_URL = "https://zosmm.com/addfunds";

/**
 * Provayder balansini tekshiradi va kerak bo'lsa Telegram orqali eslatadi.
 * Bir chegara uchun faqat bir marta yoziladi; balans 100 000 dan oshsa — qayta tiklanadi.
 */
export async function checkProviderBalance() {
  if (!providerConfigured()) return null;

  let balance: number;
  let currency: string;
  try {
    ({ balance, currency } = await fetchBalance());
  } catch {
    return null;
  }
  const fx = Number(process.env.SMM_PROVIDER_RATE_UZS || 0);
  const uzs = currency === "UZS" ? balance : balance * fx;
  if (!(uzs >= 0) || (currency !== "UZS" && !fx)) return null;

  // balans pastga tushgan eng kichik chegara (masalan 35 000 -> 40 000)
  const level = [...THRESHOLDS].reverse().find((t) => uzs < t) ?? null;

  const row = await db.appSetting.findUnique({ where: { key: KEY } });
  const prev = row ? Number(row.value) : null;
  const shown = `${num(Math.floor(uzs))} so'm` + (currency === "UZS" ? "" : ` ($${balance.toFixed(2)})`);

  if (level === null) {
    // balans normal — oldin ogohlantirilgan bo'lsa, "to'ldirildi" deb xabar beramiz
    if (prev !== null) {
      const del = await db.appSetting.deleteMany({ where: { key: KEY, value: row!.value } });
      if (del.count === 1) await notifyAdmins("✅ ZOSMM balansi to'ldirildi", [`Balans: ${shown}`]);
    }
    return { uzs, level };
  }

  if (prev === null || level < prev) {
    // shartli yozish — parallel tekshiruvlarda xabar ikki marta ketmaydi
    const claimed =
      prev === null
        ? await db.appSetting
            .create({ data: { key: KEY, value: String(level) } })
            .then(() => true)
            .catch(() => false)
        : (await db.appSetting.updateMany({ where: { key: KEY, value: row!.value }, data: { value: String(level) } }))
            .count === 1;
    if (claimed) {
      await notifyAdmins(
        level <= 10_000 ? "🚨 ZOSMM balansi tugayapti!" : "⚠️ ZOSMM balansi kamaydi",
        [
          `Balans: ${shown}`,
          `${num(level)} so'mdan kam qoldi.`,
          "Balans tugasa TayyorrSMM buyurtmalari rad etiladi (mijozlarga pul qaytadi).",
        ],
        { text: "ZOSMM balansini to'ldirish", href: ADD_FUNDS_URL },
      );
    }
  } else if (level > prev) {
    // qisman to'ldirilgan, lekin hali chegaradan past — keyingi tushishda yana yozilsin
    await db.appSetting.updateMany({ where: { key: KEY, value: row!.value }, data: { value: String(level) } });
  }
  return { uzs, level };
}
