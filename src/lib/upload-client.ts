export type UploadKind = "AVATAR" | "ATTACHMENT" | "DELIVERABLE" | "CHAT";

export interface UploadResult {
  key: string;
  bucket: "public" | "private";
  publicUrl?: string;
}

const NET_ERR = "Internet aloqasi yöq yoki server javob bermadi. Qayta urinib köring.";

/** fetch — vaqt chegarasi bilan (yuklash hech qachon abadiy "aylanib" qolmasin). */
async function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Yuklaş juda uzoq davom etdi (vaqt tugadi). Qayta urinib köring.");
    }
    throw new Error(NET_ERR);
  } finally {
    clearTimeout(t);
  }
}

/** Katta fayl uchun yetarli vaqt: kamida 60 s, har 1 MB ga +20 s. */
const putTimeout = (size: number) => 60_000 + Math.ceil(size / (1024 * 1024)) * 20_000;

/**
 * 1) backend'dan presigned URL oladi
 * 2) faylni to'g'ridan R2 ga PUT qiladi
 * 3) (ixtiyoriy) yozuvni bazaga qayd etadi
 */
export async function uploadFile(
  file: File,
  kind: UploadKind,
  opts: { orderId?: string; conversationId?: string; register?: boolean } = {},
): Promise<UploadResult> {
  const presignRes = await timedFetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      orderId: opts.orderId,
      conversationId: opts.conversationId,
    }),
  }, 25_000);
  if (!presignRes.ok) {
    const { error } = await presignRes.json().catch(() => ({}));
    throw new Error(error || "Yuklaşni boşlab bölmadi");
  }
  const { uploadUrl, key, bucket, publicUrl } = await presignRes.json();

  const put = await timedFetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  }, putTimeout(file.size));
  if (!put.ok) throw new Error("Fayl yuklanmadi. Qayta urinib köring.");

  if (opts.register) {
    const done = await timedFetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        bucket,
        kind,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        orderId: opts.orderId,
      }),
    }, 25_000);
    if (!done.ok) {
      const { error } = await done.json().catch(() => ({}));
      throw new Error(error || "Fayl saqlanmadi. Qayta urinib köring.");
    }
  }

  return { key, bucket, publicUrl };
}

/** PUT to R2 with upload progress via XHR. */
function xhrPut(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Fayl yuklanmadi"));
    xhr.onerror = () => reject(new Error(NET_ERR));
    xhr.onabort = () => reject(new Error("Yuklaş bekor qilindi"));
    xhr.timeout = putTimeout(file.size);
    xhr.ontimeout = () =>
      reject(new Error("Yuklaş juda uzoq davom etdi (vaqt tugadi). Qayta urinib köring."));
    xhr.send(file);
  });
}

export interface PreparedChatFile {
  key: string;
  name: string;
  type: string;
  size: number;
}

async function prepareVia(
  presignUrl: string,
  extra: Record<string, unknown>,
  file: File,
  onProgress: (pct: number) => void,
): Promise<PreparedChatFile> {
  const res = await timedFetch(presignUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...extra,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  }, 25_000);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.uploadUrl) throw new Error(data.error || "Yuklaşni boşlab bölmadi");

  onProgress(0);
  await xhrPut(data.uploadUrl, file, onProgress);
  onProgress(100);

  return {
    key: data.key,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
  };
}

/** presign -> R2 ga progress bilan yuklaydi. Xabar hali YUBORILMAYDI. */
export function prepareChatFile(
  file: File,
  conversationId: string,
  onProgress: (pct: number) => void,
) {
  return prepareVia(
    "/api/upload/presign",
    { kind: "CHAT", conversationId },
    file,
    onProgress,
  );
}

/** Admin uchun (support javobi). */
export function prepareAdminChatFile(
  file: File,
  conversationId: string,
  onProgress: (pct: number) => void,
) {
  return prepareVia(
    "/api/admin/upload/presign",
    { kind: "CHAT", conversationId },
    file,
    onProgress,
  );
}

/** Admin ommaviy xabar fayli. */
export function prepareBroadcastFile(
  file: File,
  onProgress: (pct: number) => void,
) {
  return prepareVia(
    "/api/admin/upload/presign",
    { kind: "BROADCAST" },
    file,
    onProgress,
  );
}
