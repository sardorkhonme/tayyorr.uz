import { GuideVideoList } from "@/components/admin/guide-video-manager";
import { StarPriceForm } from "@/components/admin/star-price-form";
import { getAllGuideVideos } from "@/lib/guide-settings";
import { getStarPrice } from "@/lib/stars";

export const dynamic = "force-dynamic";

export default async function AdminGuidePage() {
  const [videos, starPrice] = await Promise.all([getAllGuideVideos(), getStarPrice()]);
  const app = process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Qöllanma</h1>
        <p className="mt-1 text-sm text-zinc-500">
          app.tayyorr.uz dagi «Qöllanma» bölimi uçun videolar. Har bir rol uçun istalgança video qöşiş mumkin — saytda qöllanmaning eng ostida şu tartibda çiqadi, tepada esa ularga olib boruvçi tugma turadi.{" "}
          <a href={`${app}/guide`} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-200">
            Saytda köriş ›
          </a>
        </p>
      </div>
      <StarPriceForm value={starPrice} />
      <div className="grid gap-4 xl:grid-cols-2">
        <GuideVideoList role="ORDERER" title="Buyurtma beruvçi uçun videolar" videos={videos.ORDERER.map(({ id, title, url }) => ({ id, title, url }))} />
        <GuideVideoList role="PREPARER" title="Tayyorlovçi uçun videolar" videos={videos.PREPARER.map(({ id, title, url }) => ({ id, title, url }))} />
      </div>
    </div>
  );
}
