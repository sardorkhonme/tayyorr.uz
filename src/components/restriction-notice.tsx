import Link from "next/link";
import type { Restriction } from "@/lib/restriction";
import { restrictionText } from "@/lib/restriction";
import { Icon } from "@/components/icons";

/**
 * Cheklov ogohlantirishi. `restriction` — butun hisob (ban); `scoped` — admin qo'ygan qisman cheklov
 * (sarlavhada qaysi tizim va nima yopilgani: «Tayyorr.uz — buyurtma berish»).
 * Ranglar light rejimda ham o'qiladi (globals.css: text-amber-200/300 → to'q sariq, text-zinc-300 → to'q).
 */
export function RestrictionNotice({
  restriction,
  scoped,
}: {
  restriction?: Restriction | null;
  scoped?: { title: string; text: string } | null;
}) {
  const title = restriction ? "Hisobingiz vaqtinça çeklangan" : `Çeklov: ${scoped?.title ?? "bu bölim"}`;
  const text = restriction ? restrictionText(restriction) : (scoped?.text ?? "");
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 text-center">
      <Icon name="ban" className="mx-auto h-9 w-9 text-amber-300" />
      <h1 className="mt-3 text-lg font-semibold text-amber-200">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{text}</p>
      <Link href="/messages" className="btn-primary mt-5 inline-flex">
        «tayyorr.uz support» bilan boğlaniş
      </Link>
    </div>
  );
}
