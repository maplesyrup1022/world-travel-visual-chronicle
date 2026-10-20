"use client";

import React, { useEffect, useEffectEvent, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import LocationSummary from "./LocationSummary";
import Create from "./Create";
import Timeline from "./Timeline";

import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const Map = ({ visitedLocations }) => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const markersRef = useRef([]);
  const [visibleLocations, setVisibleLocations] = useState(visitedLocations);
  const [hoveredLocationSummary, setHoveredLocationSummary] = useState(null);
  const [clickedLocationSummary, setClickedLocationSummary] = useState(null);
  const dateRangeRequestRef = useRef(0);
  const dateRangeParamsRef = useRef(new URLSearchParams());
  const summaryRequestRef = useRef(0);
  const summaryCloseTimerRef = useRef(null);
  const [dateRangeQuery, setDateRangeQuery] = useState("");

  const fetchLocationSummary = async (
    id,
    params = dateRangeParamsRef.current,
  ) => {
    const requestId = ++summaryRequestRef.current;
    const query = params.toString();
    const res = await fetch(
      `http://127.0.0.1:8000/locations/${id}/summary${query ? `?${query}` : ""}`,
      { next: { revalidate: 20 } },
    );

    if (!res.ok) {
      return { requestId, summary: null };
    }

    return { requestId, summary: await res.json() };
  };

  const handleMouseHover = useEffectEvent(async (id) => {
    if (clickedLocationSummary) {
      return;
    }

    window.clearTimeout(summaryCloseTimerRef.current);
    const { requestId, summary } = await fetchLocationSummary(id);
    if (requestId !== summaryRequestRef.current) return;
    setHoveredLocationSummary(summary);
  });

  const handleMouseLeave = useEffectEvent(() => {
    if (!clickedLocationSummary) {
      summaryCloseTimerRef.current = window.setTimeout(() => {
        setHoveredLocationSummary(null);
      }, 300);
    }
  });

  const handleSummaryMouseEnter = () => {
    window.clearTimeout(summaryCloseTimerRef.current);
  };

  const handleMouseClick = useEffectEvent(async (id) => {
    const { requestId, summary } = await fetchLocationSummary(id);
    if (requestId !== summaryRequestRef.current) return;
    setClickedLocationSummary(summary);
    setHoveredLocationSummary(summary);
  });

  const handleCloseSummary = () => {
    window.clearTimeout(summaryCloseTimerRef.current);
    setClickedLocationSummary(null);
    setHoveredLocationSummary(null);
  };

  const handleSummaryChange = (summary) => {
    if (!summary) {
      handleCloseSummary();
      return;
    }

    if (clickedLocationSummary) setClickedLocationSummary(summary);
    setHoveredLocationSummary(summary);
  };

  // In React, data flows downward (one-way data binding). A child component cannot directly modify a parent's
  // state.
  // Instead, the parent must pass down a function (callback) as a prop. When the child calls this function,
  // it triggers the state change back up in the parent.
  // Never try to mutate props directly. Props are strictly read-only.
  const handleDateRangeChange = async ({ startDate, endDate, year }) => {
    const requestId = ++dateRangeRequestRef.current;
    ++summaryRequestRef.current;
    const params =
      year != null
        ? new URLSearchParams({ year: String(year) })
        : new URLSearchParams({ start_date: startDate, end_date: endDate });
    dateRangeParamsRef.current = params;
    setDateRangeQuery(params.toString());
    const selectedSummary = clickedLocationSummary || hoveredLocationSummary;
    const responsePromise = fetch(
      `http://127.0.0.1:8000/locations/visited?${params.toString()}`,
    );
    const summaryPromise = selectedSummary
      ? fetchLocationSummary(selectedSummary.location.id, params)
      : Promise.resolve(null);
    const [response, summaryResult] = await Promise.all([
      responsePromise,
      summaryPromise,
    ]);

    const locations = response.ok ? await response.json() : null;
    if (requestId !== dateRangeRequestRef.current) return;
    if (response.ok) {
      setVisibleLocations(locations);
    }
    if (
      selectedSummary &&
      summaryResult?.requestId === summaryRequestRef.current
    ) {
      const { summary } = summaryResult;
      if (clickedLocationSummary) setClickedLocationSummary(summary);
      setHoveredLocationSummary(summary);
    }
  };

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:
        "mapbox://styles/raccooncitycodingplayer/cmttytv64002h01snd7fo91nn",
      center: [126, 37],
      zoom: 3,
    });

    return () => mapRef.current.remove();
  }, []);

  useEffect(() => () => window.clearTimeout(summaryCloseTimerRef.current), []);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = visibleLocations.map(
      ({ id, city, country, longitude, latitude }) => {
        const markerElement = document.createElement("div");
        markerElement.innerHTML = `
        <div class="relative w-25 h-12.5">
          <img src="/combined-yellow-pin.png" class="absolute inset-0 w-full h-full"/>
          <span class="absolute inset-0 flex items-center justify-center
                text-xs font-alegreya font-bold translate-x-2.5 translate-y-2">${city}, ${country}</span>
        </div>
  `;
        const mapMarker = new mapboxgl.Marker(markerElement)
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current);

        markerElement.addEventListener("mouseenter", () => {
          handleMouseHover(id);
        });
        markerElement.addEventListener("mouseleave", () => {
          handleMouseLeave();
        });
        markerElement.addEventListener("click", () => {
          handleMouseClick(id);
        });

        return mapMarker;
      },
    );

    return () => markersRef.current.forEach((marker) => marker.remove());
  }, [visibleLocations]);

  return (
    <div className="relative z-0 h-full w-full">
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-full w-full"
      ></div>
      {(clickedLocationSummary || hoveredLocationSummary) && (
        <LocationSummary
          hoveredLocationSummary={
            clickedLocationSummary || hoveredLocationSummary
          }
          onClose={handleCloseSummary}
          onMouseEnter={handleSummaryMouseEnter}
          onSummaryChange={handleSummaryChange}
          dateRangeQuery={dateRangeQuery}
        />
      )}
      <Create />
      <Timeline onDateRangeChange={handleDateRangeChange} />
    </div>
  );
};

export default Map;
