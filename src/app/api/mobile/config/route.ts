import { googleBirthdayEnabled } from "@/lib/birthday-scope";
import { mobileJson } from "@/lib/mobile-cors";
import { getCustomVersionLabel } from "@/lib/app-version";
import { apkUrl, getMobileUpdate, versionCode } from "@/lib/mobile-update";
import { getMinOfferStars, getStarPrice } from "@/lib/stars";

export { OPTIONS } from "@/lib/mobile-cors";

/** Ilova uchun ochiq sozlamalar (kirishdan oldin ham kerak bo'ladi). */
export async function GET() {
  const [versionLabel, update, starPrice, minOfferStars] = await Promise.all([
    getCustomVersionLabel(),
    getMobileUpdate(),
    getStarPrice(),
    getMinOfferStars(),
  ]);
  return mobileJson({
    googleBirthdayScope: googleBirthdayEnabled(),
    // admin qo'ygan versiya yorlig'i; bo'sh bo'lsa ilova o'z build versiyasini ko'rsatadi
    versionLabel,
    // ilova yangilanishi: build < minBuild — majburiy oyna; build < latestBuild — "yangilanish bor"
    update: {
      min: update.min,
      minBuild: versionCode(update.min),
      latest: update.latest,
      latestBuild: versionCode(update.latest),
      apkUrl: apkUrl(update),
      notes: update.notes,
    },
    starPrice,
    minOfferStars,
  });
}
