import Link from "next/link";
import type { Restriction } from "@/lib/restriction";
import { restrictionText } from "@/lib/restriction";
import { Icon } from "@/components/icons";

export function RestrictionNotice({ restriction }: { restriction: Restriction }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-center">
      <Icon name="ban" className="mx-auto h-9 w-9 text-amber-300" />
      <h1 className="mt-3 text-lg font-semibold text-amber-100">
        Bu bölim vaqtinça çeklangan
      </h1>
      <p className="mt-2 text-sm text-amber-200/90">{restrictionText(restriction)}</p>
      <Link href="/messages" className="btn-primary mt-5 inline-flex">
        «tayyorr.uz support» bilan boğlaniş
      </Link>
    </div>
  );
}
