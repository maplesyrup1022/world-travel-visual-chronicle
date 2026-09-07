import Image from "next/image";
import Map from "./components/Map";
import NavigationBar from "./components/NavBar";
import Timeline from "./components/Timeline";
import Link from "next/link";
import Create from "./components/Create";

export default async function Home() {
  const res = await fetch("http://127.0.0.1:8000/locations/visited", {
    next: { revalidate: 20 },
  });
  const visitedLocations = await res.json();
  return (
    <div>
      <NavigationBar />
      <Map visitedLocations={visitedLocations} />
      <Create />
      <Timeline />
      <Link href="/chronicle">View Chronicle</Link>
    </div>
  );
}
