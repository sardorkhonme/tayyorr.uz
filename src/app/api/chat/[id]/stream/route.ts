import { chatActor, conversationForActor } from "@/lib/chat-actor";
import { chatBus } from "@/lib/chat-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-Sent Events: suhbatga yangi xabar / o'qildi hodisalari. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await chatActor(req);
  if (!actor) {
    return new Response("unauthorized", { status: 401 });
  }
  const { id } = await params;
  const conv = await conversationForActor(id, actor);
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
      req.signal.addEventListener("abort", close);
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
