import Map from "./components/Map";
import NavigationBar from "./components/NavBar";

export default async function Home() {
  const res = await fetch("http://127.0.0.1:8000/locations/visited", {
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
