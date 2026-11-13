import Chronicle from "../components/Chronicle";

type ChronicleSearchParams = {
  year?: string;
  start_date?: string;
  end_date?: string;
};

export default async function ChroniclePage({
  searchParams,
}: {
  searchParams: Promise<ChronicleSearchParams>;
}) {
  const selectedParams = await searchParams;
  const params = new URLSearchParams();
  if (selectedParams.year) {
    params.set("year", selectedParams.year);
  } else if (selectedParams.start_date && selectedParams.end_date) {
    params.set("start_date", selectedParams.start_date);
    params.set("end_date", selectedParams.end_date);
  }
  const query = params.toString();
  const querySuffix = query ? `?${query}` : "";
  const periodLabel =
    selectedParams.year ||
    (selectedParams.start_date && selectedParams.end_date
      ? `${selectedParams.start_date} – ${selectedParams.end_date}`
      : "All dates");

  const res = await fetch(`http://127.0.0.1:8000/chronicle${querySuffix}`, {
    next: { revalidate: 20 },
  });
  if (!res.ok) {
    throw new Error(`Could not load chronicle (${res.status}).`);
  }
  const chronicle = await res.json();
  const res2 = await fetch(
    `http://127.0.0.1:8000/chronicle/stats${querySuffix}`,
    { next: { revalidate: 20 } },
  );
  if (!res2.ok) {
    throw new Error(`Could not load chronicle stats (${res2.status}).`);
  }
  const stats = await res2.json();
  return (
    <Chronicle
      chronicle={chronicle}
      stats={stats}
      periodLabel={periodLabel}
      querySuffix={querySuffix}
    />
  );
}
