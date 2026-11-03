import { APP_URL } from "@/lib/links";

export type LandingVideo = { id: string; title: string; videoUrl: string };
export type LandingMedia = { heroVideo: string | null; videos: LandingVideo[] };

/**
 * Hero fon videosi va video panjarasi — admin panelda boshqariladi, app.tayyorr.uz dan olinadi
 * (landing bazaga ulanmagan). Xato bo'lsa sahifa videolarsiz ochilaveradi.
 */
export async function getLandingMedia(): Promise<LandingMedia> {
  try {
    const res = await fetch(`${APP_URL}/api/public/landing`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as Partial<LandingMedia>;
    return { heroVideo: data.heroVideo ?? null, videos: Array.isArray(data.videos) ? data.videos : [] };
  } catch {
    return { heroVideo: null, videos: [] };
  }
}
