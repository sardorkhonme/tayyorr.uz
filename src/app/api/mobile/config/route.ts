import { googleBirthdayEnabled } from "@/lib/birthday-scope";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Ilova uchun ochiq sozlamalar (kirishdan oldin ham kerak bo'ladi). */
export async function GET() {
  return mobileJson({ googleBirthdayScope: googleBirthdayEnabled() });
}
