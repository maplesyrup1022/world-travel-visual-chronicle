import Map from "./components/Map";
import NavigationBar from "./components/NavBar";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export default async function Home() {
  const res = await fetch(`${backendUrl}/locations/visited`, {
    next: { revalidate: 20 },
  });
  const visitedLocations = await res.json();
  return (
    <div className="relative h-full w-full z-0">
      <NavigationBar />
      <Map visitedLocations={visitedLocations} />
    </div>
  );
}
