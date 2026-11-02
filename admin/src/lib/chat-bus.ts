import { EventEmitter } from "events";

/**
 * Jarayon ichidagi oddiy pub/sub — SSE stream'lariga yangi xabarni yetkazish uchun.
 * Bitta Node instansiyada real vaqt rejimi. Ko'p instansiyali (serverless) deploy'da
 * bu instansiyalararo tarqalmaydi — o'sha holатда klient polling bilan baribир xabarni
 * oladi (kechikish bilan). Keyinchalik Redis/Ably bilan almashtiriladi.
 */

export interface SerializedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  system: boolean;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  deleted: boolean;
  replyTo: null | {
    id: string;
    authorId: string;
    text: string;
    deleted: boolean;
  };
  file: null | {
    name: string;
    type: string;
    size: number;
    url: string;
  };
}

type ChatEvent =
  | { type: "message"; message: SerializedMessage }
  | { type: "edit"; message: SerializedMessage }
  | { type: "delete"; messageId: string; updatedAt: string }
  | { type: "reaction"; messageId: string; like: number; dislike: number }
  | { type: "read"; by: string; at: string };

const g = globalThis as unknown as { __chatBus?: EventEmitter };
export const chatBus = g.__chatBus ?? new EventEmitter();
chatBus.setMaxListeners(0);
if (process.env.NODE_ENV !== "production") g.__chatBus = chatBus;

export function publishToConversation(conversationId: string, event: ChatEvent) {
  chatBus.emit(`conv:${conversationId}`, event);
}
