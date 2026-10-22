import Chronicle from "../components/Chronicle";

export default async function ChroniclePage() {
  const res = await fetch("http://127.0.0.1:8000/chronicle", {
    next: { revalidate: 20 },
  });
  if (!res.ok) {
    throw new Error(`Could not load chronicle (${res.status}).`);
  }
  const chronicle = await res.json();
  const res2 = await fetch("http://127.0.0.1:8000/chronicle/stats", {
    next: { revalidate: 20 },
  });
  if (!res2.ok) {
    throw new Error(`Could not load chronicle stats (${res2.status}).`);
  }
  const stats = await res2.json();
  return <Chronicle chronicle={chronicle} stats={stats} year={2025} />;
}
