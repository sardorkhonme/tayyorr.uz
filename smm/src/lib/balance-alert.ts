import { db } from "@/lib/db";
import { num } from "@/lib/format";
import { getPricing } from "@/lib/pricing";
import { fetchBalance, providerAddFundsUrl, providerConfigured, providerName } from "@/lib/provider";
import { notifyAdmins } from "@/lib/telegram";

/** Ogohlantirish chegaralari (so'm) — balans shulardan pastga tushganda bir martadan xabar. */
const THRESHOLDS = [100_000, 50_000, 40_000, 30_000, 20_000, 10_000];
/** Oxirgi xabar berilgan chegara (bo'lmasa — balans normal). */
const LEVEL_KEY = "smmProviderAlertLevel";
/** Oxirgi ko'rilgan provayder balansi (o'z valyutasida) — har o'zgarish haqida xabar uchun. */
const LAST_KEY = "smmProviderLastBalance";

/** Shartli yozuv: faqat qiymat `prev` bo'lsa almashtiradi — parallel tekshiruvlarda xabar takrorlanmaydi. */
async function swap(key: string, prev: string | null, next: string | null) {
  if (prev === null) {
    if (next === null) return false;
    return db.appSetting
      .create({ data: { key, value: next } })
      .then(() => true)
      .catch(() => false);
  }
  if (next === null) return (await db.appSetting.deleteMany({ where: { key, value: prev } })).count === 1;
  return (await db.appSetting.updateMany({ where: { key, value: prev }, data: { value: next } })).count === 1;
}

/**
 * Provayder (SMM panel) balansini tekshiradi:
 * - har o'zgarishda (to'ldirildi / yechildi) "SMM tizim balansi" topigiga xabar;
 * - 100k/50k/40k/30k/20k/10k so'mdan tushganda bir martalik ogohlantirish.
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
  const fx = (await getPricing())?.fx ?? 0;
  const isUzs = currency === "UZS";
  if (!isUzs && !fx) return null;
  const toUzs = (v: number) => (isUzs ? v : v * fx);
  const fmt = (v: number) =>
    `${num(Math.round(toUzs(v)))} so'm` + (isUzs ? "" : ` ($${v.toFixed(2)})`);
  const uzs = toUzs(balance);
  const name = providerName();
  const addFundsHref = providerAddFundsUrl();
  const addFunds = addFundsHref ? { text: `${name} balansini to'ldirish`, href: addFundsHref } : undefined;

  const [lastRow, levelRow] = await Promise.all([
    db.appSetting.findUnique({ where: { key: LAST_KEY } }),
    db.appSetting.findUnique({ where: { key: LEVEL_KEY } }),
  ]);

  // 1) balans o'zgarishi
  const cur = balance.toFixed(4);
  const prevStr = lastRow?.value ?? null;
  if (prevStr !== cur && (await swap(LAST_KEY, prevStr, cur))) {
    if (prevStr === null) {
      await notifyAdmins("system", `🔌 ${name} kuzatuvi yoqildi`, [`Joriy balans: ${fmt(balance)}`]);
    } else {
      const diff = balance - Number(prevStr);
      await notifyAdmins(
        "system",
        diff > 0 ? `💰 ${name} hisobi to'ldirildi` : `➖ ${name} hisobidan yechildi`,
        [`${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}`, `Balans: ${fmt(balance)}`],
      );
    }
  }

  // 2) chegaradan tushish ogohlantirishi — eng kichik kesib o'tilgan chegara (35 000 -> 40 000)
  const level = [...THRESHOLDS].reverse().find((t) => uzs < t) ?? null;
  const prevLevel = levelRow?.value ?? null;

  if (level === null) {
    if (prevLevel !== null) await swap(LEVEL_KEY, prevLevel, null);
  } else if (prevLevel === null || level < Number(prevLevel)) {
    if (await swap(LEVEL_KEY, prevLevel, String(level))) {
      await notifyAdmins(
        "system",
        level <= 10_000 ? `🚨 ${name} balansi tugayapti!` : `⚠️ ${name} balansi kamaydi`,
        [
          `Balans: ${fmt(balance)}`,
          `${num(level)} so'mdan kam qoldi.`,
          "Balans tugasa TayyorrSMM buyurtmalari rad etiladi (mijozlarga pul qaytadi).",
        ],
        addFunds,
      );
    }
  } else if (level > Number(prevLevel)) {
    // qisman to'ldirilgan, lekin hali chegaradan past — keyingi tushishda yana yozilsin
    await swap(LEVEL_KEY, prevLevel, String(level));
  }

  return { balance, currency, uzs, level };
}
