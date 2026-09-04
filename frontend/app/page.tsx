import HomeGate from "@/components/home/HomeGate";
import { getFeaturedProperties } from "@/lib/api";

export default async function HomePage() {
  const properties = await getFeaturedProperties(4);
  return <HomeGate featuredProperties={properties} />;
}
