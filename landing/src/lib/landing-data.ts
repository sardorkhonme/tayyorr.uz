import { APP_URL } from "@/lib/links";

export type LandingVideo = { id: string; title: string; videoUrl: string };
export type LandingMedia = { videos: LandingVideo[] };

/**
 * Video panjarasi — admin panelda boshqariladi, app.tayyorr.uz dan olinadi
 * (landing bazaga ulanmagan). Xato bo'lsa sahifa videolarsiz ochilaveradi.
 */
export async function getLandingMedia(): Promise<LandingMedia> {
  try {
    const res = await fetch(`${APP_URL}/api/public/landing`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as Partial<LandingMedia>;
    return { videos: Array.isArray(data.videos) ? data.videos : [] };
  } catch {
    return { videos: [] };
  }
}
