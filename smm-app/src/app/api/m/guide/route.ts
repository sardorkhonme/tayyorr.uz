import { NextResponse } from "next/server";

import { PICKS, RULES, SECTIONS, TONE } from "@/lib/guide-data";

/** Mobil ilova: Tayyorr SMM qo'llanmasi (saytdagi /qollanma bilan bir xil ma'lumot). Ochiq. */
export function GET() {
  return NextResponse.json({
    rules: RULES,
    picks: PICKS,
    tones: Object.fromEntries(Object.entries(TONE).map(([k, v]) => [k, v.label])),
    sections: SECTIONS,
  });
}
