import { EarthquakeDashboard } from "@/components/earthquake-dashboard";
import { getEarthquakeEvents } from "@/lib/jma";

export const revalidate = 300;

export default async function Home() {
  const events = await getEarthquakeEvents();

  return <EarthquakeDashboard events={events} />;
}