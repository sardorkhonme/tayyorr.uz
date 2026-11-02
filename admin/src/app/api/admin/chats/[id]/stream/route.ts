import { adminApiGuard } from "@/lib/admin";
import { db } from "@/lib/db";
import { chatBus } from "@/lib/chat-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin uchun Server-Sent Events — istalgan suhbatni jonli kuzatish.
 * Oddiy /api/chat/[id]/stream'dan farqi: ishtirokchi bo'lish shart emas,
 * faqat admin sessiyasi kerak.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const conv = await db.conversation.findUnique({ where: { id }, select: { id: true } });
  if (!conv) return new Response("not found", { status: 404 });

  const channel = `conv:${id}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const write = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* yopilgan */
        }
      };
      write(`retry: 3000\n\n`);
      write(`data: ${JSON.stringify({ type: "ready" })}\n\n`);

      const onEvent = (event: unknown) => {
        write(`data: ${JSON.stringify(event)}\n\n`);
      };
      chatBus.on(channel, onEvent);

      const ping = setInterval(() => write(`: ping\n\n`), 25000);

      const close = () => {
        clearInterval(ping);
        chatBus.off(channel, onEvent);
        try {
          controller.close();
        } catch {
          /* allaqachon yopilgan */
        }
      };
      _req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
