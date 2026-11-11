import { FinanceSettingsForm } from "@/components/admin/finance-settings";
import { OfferStarsForm } from "@/components/admin/offer-stars-form";
import { SmmSettingsForm } from "@/components/admin/smm-settings-form";
import { StarPriceForm } from "@/components/admin/star-price-form";
import { Icon } from "@/components/icons";
import { getFinanceSettings, PAYOUT_COMMISSION_PERCENT } from "@/lib/finance";
import { getMinOfferStars } from "@/lib/offer-settings";
import { getSmmSettings } from "@/lib/smm-settings";
import { getStarPrice } from "@/lib/stars";

/**
 * Pul bilan bog'liq barcha sozlamalar bir joyda (Moliya): star narxi, ariza uchun minimal star,
 * Tayyorr SMM ustamasi, Click / Payme va provayderga to'lov foizlari.
 */
export async function MoneySettings() {
  const [starPrice, minStars, smm, fin] = await Promise.all([getStarPrice(), getMinOfferStars(), getSmmSettings(), getFinanceSettings()]);
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Icon name="coins" className="h-5 w-5 text-amber-300" />
          Pul sozlamalari
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Narxlar, foizlar va ustamalar — barçasi şu yerda. Kartaga yeçiş komissiyasi: <b className="text-zinc-300">{PAYOUT_COMMISSION_PERCENT}%</b>.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StarPriceForm value={starPrice} />
        <OfferStarsForm value={minStars} />
        <SmmSettingsForm markupPercent={smm.markupPercent} markupIsDefault={smm.markupIsDefault} fx={smm.usd?.rate ?? null} />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-3 font-semibold text-white">Tölov tizimlari va provayder foizlari</h3>
          <FinanceSettingsForm clickPct={fin.clickPct} paymePct={fin.paymePct} deposit={fin.deposit} />
        </div>
      </div>
    </section>
  );
}
