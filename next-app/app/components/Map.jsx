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

  const fetchLocationSummary = async (id) => {
    const res = await fetch(`http://127.0.0.1:8000/locations/${id}/summary`, {
      next: { revalidate: 20 },
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  };

  const handleMouseHover = useEffectEvent(async (id) => {
    if (clickedLocationSummary) {
      return;
    }

    const summary = await fetchLocationSummary(id);
    setHoveredLocationSummary(summary);
  });

  const handleMouseLeave = useEffectEvent(() => {
    if (!clickedLocationSummary) {
      setHoveredLocationSummary(null);
    }
  });

  const handleMouseClick = useEffectEvent(async (id) => {
    const summary = await fetchLocationSummary(id);
    setClickedLocationSummary(summary);
    setHoveredLocationSummary(summary);
  });

  const handleCloseSummary = () => {
    setClickedLocationSummary(null);
    setHoveredLocationSummary(null);
  };

  const handleDateRangeChange = async ({ startDate, endDate, year }) => {
    const params = year
      ? new URLSearchParams({ year: String(year) })
      : new URLSearchParams({ start_date: startDate, end_date: endDate });
    const response = await fetch(
      `http://127.0.0.1:8000/locations/visited?${params.toString()}`,
    );

    if (response.ok) {
      setVisibleLocations(await response.json());
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
                text-xs font-ribbon font-bold translate-x-2.5 translate-y-2">${city}, ${country}</span>
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
        />
      )}
      <Create />
      <Timeline onDateRangeChange={handleDateRangeChange} />
    </div>
  );
};

export default Map;
