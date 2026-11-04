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

/** Oxirgi tekshiruv vaqti — admin panel shuni "tekshirildi" deb ko'rsatadi. Kalit admin bilan bir xil. */
const CHECKED_KEY = "smmProviderBalanceCheckedAt";

/**
 * `minGapMs` ichida ko'pi bilan bir marta `checkProviderBalance` (admin "Yangilash" tugmasi
 * ochiq endpoint orqali chaqiradi). Navbat shartli yozuv bilan olinadi — parallel so'rovlarda takrorlanmaydi.
 */
/** Admin uchun: vaqt + provayder nomi va to'ldirish havolasi (admin'da provayder sozlamalari yo'q). */
function checkedValue() {
  return JSON.stringify({ at: new Date().toISOString(), name: providerName(), addFunds: providerAddFundsUrl() });
}

export async function maybeCheckProviderBalance(minGapMs = 60_000) {
  const now = new Date();
  const claimed = await db.appSetting.updateMany({
    where: { key: CHECKED_KEY, updatedAt: { lt: new Date(now.getTime() - minGapMs) } },
    data: { value: now.toISOString() },
  });
  if (claimed.count !== 1) {
    // birinchi marta — yozuv yo'q bo'lsa yaratadi (bor bo'lsa hali vaqti kelmagan)
    const created = await db.appSetting.createMany({
      data: [{ key: CHECKED_KEY, value: now.toISOString() }],
      skipDuplicates: true,
    });
    if (created.count !== 1) return null;
  }
  return checkProviderBalance();
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
  await db.appSetting
    .upsert({
      where: { key: CHECKED_KEY },
      update: { value: checkedValue() },
      create: { key: CHECKED_KEY, value: checkedValue() },
    })
    .catch(() => {});
  const fx = (await getPricing())?.fx ?? 0;
  const isUzs = currency === "UZS";
  if (!isUzs && !fx) return null;
  const toUzs = (v: number) => (isUzs ? v : v * fx);
  const fmt = (v: number) =>
    `${num(Math.round(toUzs(v)))} söm` + (isUzs ? "" : ` ($${v.toFixed(2)})`);
  const uzs = toUzs(balance);
  const name = providerName();
  const addFundsHref = providerAddFundsUrl();
  const addFunds = addFundsHref ? { text: `${name} balansini töldiriş`, href: addFundsHref } : undefined;

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
        diff > 0 ? `💰 ${name} hisobi töldirildi` : `➖ ${name} hisobidan yeçildi`,
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
          `${num(level)} sömdan kam qoldi.`,
          "Balans tugasa tayyorr+ buyurtmalari rad etiladi (mijozlarga pul qaytadi).",
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
