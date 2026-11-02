import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { createReferralLink } from "@/lib/referral";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Nom noto'g'ri" },
      { status: 400 },
    );
  }

  const link = await createReferralLink(parsed.data.name);
  return NextResponse.json({ link }, { status: 201 });
}
