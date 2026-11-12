import { BrandLoader } from "@/components/brand-loader";

/**
 * Zaxira (fallback) — har bir sahifa o'zining aniqroq loading.tsx
 * faylini beradi, bu faqat ulardan birortasi bo'lmagan holat uchun:
 * og'ir shimmer o'rniga brend yuklagiçi.
 */
export default function AppLoading() {
  return <BrandLoader className="min-h-[50vh]" />;
}
