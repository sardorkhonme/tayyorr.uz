import { db } from "@/lib/db";
import { PRIVATE_BUCKET, presignGet } from "@/lib/r2";
import { BroadcastConsole } from "@/components/admin/broadcast-console";
import { splitSource, stripSource } from "@/lib/message-source";

export default async function AdminBroadcast() {
  const rows = await db.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const ids = rows.map((r) => r.id);

  const msgs = ids.length
    ? await db.message.findMany({
        where: { broadcastId: { in: ids } },
        select: { broadcastId: true, readAt: true },
      })
    : [];
  const reactions = ids.length
    ? await db.messageReaction.findMany({
        where: { message: { broadcastId: { in: ids } } },
        select: { value: true, message: { select: { broadcastId: true } } },
      })
    : [];

  const stat = (id: string) => ({
    readCount: msgs.filter((m) => m.broadcastId === id && m.readAt).length,
    likeCount: reactions.filter(
      (r) => r.message.broadcastId === id && r.value === "LIKE",
    ).length,
    dislikeCount: reactions.filter(
      (r) => r.message.broadcastId === id && r.value === "DISLIKE",
    ).length,
  });

  const initial = await Promise.all(
    rows.reverse().map(async (b) => ({
      id: b.id,
      body: stripSource(b.body),
      source: splitSource(b.body).source,
      fileName: b.fileName,
      fileType: b.fileType,
      fileUrl: b.fileKey
        ? await presignGet({ bucket: PRIVATE_BUCKET, key: b.fileKey, expiresIn: 3600 })
        : null,
      sentCount: b.sentCount,
      createdAt: b.createdAt.toISOString(),
      ...stat(b.id),
    })),
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold text-white">Ommaviy xabar</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Filtrni tanlang, pastda oddiy xabardek yozib yuboring — «tayyorr.uz
          support» nomidan boradi (real vaqt + push).
        </p>
      </div>
      <BroadcastConsole initial={initial} />
    </div>
  );
}
