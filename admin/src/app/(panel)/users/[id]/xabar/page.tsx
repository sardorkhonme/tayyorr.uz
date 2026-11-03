import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getSupportUserId } from "@/lib/support";
import { Icon } from "@/components/icons";

export default async function AdminUserSupportMessage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, isSupport: true },
  });
  if (!user || user.isSupport) notFound();

  const supportId = await getSupportUserId();
  const conv = await db.conversation.findFirst({
    where: {
      OR: [
        { userAId: supportId, userBId: user.id },
        { userAId: user.id, userBId: supportId },
      ],
    },
    select: { id: true },
  });

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-2 font-semibold text-white">tayyorr.uz support çati</h2>
      <p className="mb-4 text-sm text-zinc-400">
        Oddiy çatdagidek: matn, fayl (yuborişdan oldin köriş), ovozli xabar,
        javob beriş, reaksiya va ✓✓ belgilari.
      </p>
      <Link
        href={
          conv
            ? `/messages/${conv.id}`
            : `/messages/new?user=${user.id}`
        }
        className="btn-primary inline-flex"
      >
        <Icon name="message" className="h-4 w-4" />
        Çatni oçiş
      </Link>
    </section>
  );
}
