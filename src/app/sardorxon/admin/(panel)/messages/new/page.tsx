import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getOrCreateConversation } from "@/lib/chat";
import { getSupportUserId } from "@/lib/support";

/** Foydalanuvchi bilan support suhbatini ochadi (yo'q bo'lsa yaratadi) va chatga o'tadi. */
export default async function AdminNewMessage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const { user: userId } = await searchParams;
  if (!userId) notFound();
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, isSupport: true } });
  if (!user || user.isSupport) notFound();

  const conv = await getOrCreateConversation(await getSupportUserId(), user.id, null);
  redirect(`/sardorxon/admin/messages/${conv.id}`);
}
