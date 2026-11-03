import { NextResponse } from "next/server";
import { z } from "zod";

import { PRIVATE_BUCKET, buildKey, presignPut } from "@/lib/r2";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getConversationForUser } from "@/lib/chat";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { getSupportUserId } from "@/lib/support";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(150),
});

/** Chatga fayl biriktirish uchun presigned PUT URL — web /api/upload/presign (CHAT) bilan bir xil mantiq. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const me = auth.userId;

  const conv = await getConversationForUser(id, me);
  if (!conv) return mobileJson({ error: "Suhbat topilmadi" }, { status: 404 });

  const restriction = await getRestriction(me);
  if (restriction) {
    const supportId = await getSupportUserId();
    const isSupportThread = conv.userAId === supportId || conv.userBId === supportId;
    if (!isSupportThread) {
      return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
    }
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri sörov" }, { status: 400 });
  const { filename, contentType } = parsed.data;

  const key = buildKey(`chat/${id}`, filename);
  const uploadUrl = await presignPut({ bucket: PRIVATE_BUCKET, key, contentType });

  return mobileJson({ uploadUrl, key });
}
