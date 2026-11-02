export type UploadKind = "AVATAR" | "ATTACHMENT" | "DELIVERABLE" | "CHAT";

export interface UploadResult {
  key: string;
  bucket: "public" | "private";
  publicUrl?: string;
}

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
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      orderId: opts.orderId,
      conversationId: opts.conversationId,
    }),
  });
  if (!presignRes.ok) {
    const { error } = await presignRes.json().catch(() => ({}));
    throw new Error(error || "Yuklashni boshlab bo'lmadi");
  }
  const { uploadUrl, key, bucket, publicUrl } = await presignRes.json();

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error("Fayl R2 ga yuklanmadi");

  if (opts.register) {
    await fetch("/api/upload/complete", {
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
    });
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
    xhr.onerror = () => reject(new Error("Tarmoq xatosi"));
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
  const res = await fetch(presignUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...extra,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Yuklashni boshlab bo'lmadi");

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
