import { googleBirthdayEnabled } from "@/lib/birthday-scope";
import { mobileJson } from "@/lib/mobile-cors";
import { getCustomVersionLabel } from "@/lib/app-version";

export { OPTIONS } from "@/lib/mobile-cors";

/** Ilova uchun ochiq sozlamalar (kirishdan oldin ham kerak bo'ladi). */
export async function GET() {
  return mobileJson({
    googleBirthdayScope: googleBirthdayEnabled(),
    // admin qo'ygan versiya yorlig'i; bo'sh bo'lsa ilova o'z build versiyasini ko'rsatadi
    versionLabel: await getCustomVersionLabel(),
  });
}
