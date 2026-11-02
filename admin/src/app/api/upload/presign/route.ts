import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import {
  PUBLIC_BUCKET,
  PRIVATE_BUCKET,
  buildKey,
  presignPut,
  publicUrl,
} from "@/lib/r2";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { getConversationForUser } from "@/lib/chat";
import { getSupportUserId } from "@/lib/support";

const schema = z.object({
  kind: z.enum(["AVATAR", "ATTACHMENT", "DELIVERABLE", "CHAT"]),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(150),
  orderId: z.string().optional(),
  conversationId: z.string().optional(),
});

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const me = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const { kind, filename, contentType, orderId, conversationId } = parsed.data;
  const restriction = await getRestriction(me);

  // ---- CHAT fayllari ----
  if (kind === "CHAT") {
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId kerak" }, { status: 400 });
    }
    const conv = await getConversationForUser(conversationId, me);
    if (!conv) {
      return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
    }
    if (restriction) {
      const supportId = await getSupportUserId();
      const isSupportThread =
        conv.userAId === supportId || conv.userBId === supportId;
      if (!isSupportThread) {
        return NextResponse.json({ error: restrictionText(restriction) }, { status: 403 });
      }
    }
    // chatда istalgan fayl turi (rasm/video/audio/zip/pdf/...)
    const key = buildKey(`chat/${conversationId}`, filename);
    const uploadUrl = await presignPut({ bucket: PRIVATE_BUCKET, key, contentType });
    return NextResponse.json({ uploadUrl, key, bucket: "private" });
  }

  // ---- qolganlari: cheklangan foydalanuvchiga ruxsat yo'q ----
  if (restriction) {
    return NextResponse.json({ error: restrictionText(restriction) }, { status: 403 });
  }

  if (kind === "AVATAR") {
    if (!IMAGE_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Faqat rasm yuklang" }, { status: 400 });
    }
    const key = buildKey(`avatars/${me}`, filename);
    const uploadUrl = await presignPut({ bucket: PUBLIC_BUCKET, key, contentType });
    return NextResponse.json({
      uploadUrl,
      key,
      bucket: "public",
      publicUrl: publicUrl(key),
    });
  }

  if (!DOC_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Fayl turi qo'llab-quvvatlanmaydi" }, { status: 400 });
  }
  const prefix = orderId ? `orders/${orderId}` : `misc/${me}`;
  const key = buildKey(prefix, filename);
  const uploadUrl = await presignPut({ bucket: PRIVATE_BUCKET, key, contentType });
  return NextResponse.json({ uploadUrl, key, bucket: "private" });
}
