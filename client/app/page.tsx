import HeroBanner from "@/components/HeroBanner";
import CategoryStrip from "@/components/CategoryStrip";
import BestSellers from "@/components/BestSellers";
import { getSliders } from "@/lib/api";

export default async function Home() {
  const slides = await getSliders();

  return (
    <>
      <HeroBanner slides={slides} />
      <CategoryStrip />
      <BestSellers />
    </>
  );
}