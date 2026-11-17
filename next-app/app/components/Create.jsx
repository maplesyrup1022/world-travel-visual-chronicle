"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatDateInput, parseDateInput } from "./dateInput";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const actions = [
  { key: "life-period", label: "Life Period", className: "bg-[#f49ab8]" },
  { key: "experience", label: "Experience", className: "bg-[#ef739d]" },
  { key: "media", label: "Media", className: "bg-[#d94c7d]" },
];

const fieldGroups = {
  "life-period": {
    title: "New life period*",
    fields: ["Description", "Start date*", "End date*", "Tag", "Location*"],
  },
  experience: {
    title: "New experience*",
    fields: [
      "Life period",
      "Experience type",
      "Description",
      "Start date*",
      "End date*",
      "Location",
    ],
  },
  media: {
    title: "Media Title",
    fields: ["Captured at", "Location", "Description", "Experience"],
  },
};

const formAccents = {
  "life-period": {
    marker: "bg-[#f4b4c6]",
    focus: "focus:ring-[#e94f86]",
    button: "bg-[#e94f86] hover:bg-[#d43e74]",
  },
  experience: {
    marker: "bg-[#f2c894]",
    focus: "focus:ring-[#d58c45]",
    button: "bg-[#d58c45] hover:bg-[#bd7634]",
  },
  media: {
    marker: "bg-[#b9d5c1]",
    focus: "focus:ring-[#668b70]",
    button: "bg-[#668b70] hover:bg-[#52745c]",
  },
};

export default function Create() {
  const [open, setOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [titleText, setTitleText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaInspection, setMediaInspection] = useState(null);
  const [mediaInspectionError, setMediaInspectionError] = useState("");
  const [isInspectingMedia, setIsInspectingMedia] = useState(false);
  const [mediaCapturedAt, setMediaCapturedAt] = useState("");
  const [formPosition, setFormPosition] = useState({ x: 0, y: 0 });
  const [saveNotice, setSaveNotice] = useState(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeSearchError, setPlaceSearchError] = useState("");
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [lifePeriodQuery, setLifePeriodQuery] = useState("");
  const [lifePeriodDropdownOpen, setLifePeriodDropdownOpen] = useState(false);
  const [lifePeriodResults, setLifePeriodResults] = useState([]);
  const [selectedLifePeriod, setSelectedLifePeriod] = useState(null);
  const [lifePeriodSearchError, setLifePeriodSearchError] = useState("");
  const [isSearchingLifePeriods, setIsSearchingLifePeriods] = useState(false);
  const [experienceQuery, setExperienceQuery] = useState("");
  const [experienceDropdownOpen, setExperienceDropdownOpen] = useState(false);
  const [experienceResults, setExperienceResults] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [experienceSearchError, setExperienceSearchError] = useState("");
  const [isSearchingExperiences, setIsSearchingExperiences] = useState(false);
  const rootRef = useRef(null);
  const dragStartRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const mediaFileInputRef = useRef(null);

  useEffect(() => {
    if (
      !["life-period", "experience", "media"].includes(activeForm) ||
      !placeQuery.trim()
    ) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!accessToken) {
        setPlaceSearchError("Mapbox search is not configured.");
        setIsSearchingPlaces(false);
        return;
      }

      setIsSearchingPlaces(true);
      setPlaceSearchError("");
      try {
        const params = new URLSearchParams({
          q: placeQuery.trim(),
          types: "place",
          autocomplete: "false",
          access_token: accessToken,
        });
        const response = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Place search failed (${response.status}).`);
        }

        const result = await response.json();
        const places = (result.features || [])
          .map((feature) => {
            const city = feature.properties?.name;
            const country = feature.properties?.context?.country?.name;
            const coordinates = feature.geometry?.coordinates;
            if (
              !city ||
              !country ||
              !Array.isArray(coordinates) ||
              coordinates.length < 2
            ) {
              return null;
            }
            return {
              city,
              country,
              longitude: coordinates[0],
              latitude: coordinates[1],
            };
          })
          .filter(Boolean);
        setPlaceResults(places);
      } catch (error) {
        if (error.name !== "AbortError") {
          setPlaceSearchError(error.message || "Place search failed.");
          setPlaceResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingPlaces(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeForm, placeQuery]);

  useEffect(() => {
    if (activeForm !== "experience" || !lifePeriodDropdownOpen) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearchingLifePeriods(true);
      setLifePeriodSearchError("");
      try {
        const params = new URLSearchParams({ limit: "5" });
        if (lifePeriodQuery.trim()) {
          params.set("search", lifePeriodQuery.trim());
        }
        const response = await fetch(`${backendUrl}/life-periods?${params}`, {
          signal: controller.signal,
        });
        const body = await response.text();
        const result = body ? JSON.parse(body) : [];
        if (!response.ok) {
          throw new Error(
            result.detail || `Life-period search failed (${response.status}).`,
          );
        }
        setLifePeriodResults(result.slice(0, 5));
      } catch (error) {
        if (error.name !== "AbortError") {
          setLifePeriodSearchError(
            error.message || "Life-period search failed.",
          );
          setLifePeriodResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingLifePeriods(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeForm, lifePeriodDropdownOpen, lifePeriodQuery]);

  useEffect(() => {
    if (
      activeForm !== "media" ||
      !experienceDropdownOpen ||
      !experienceQuery.trim()
    ) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearchingExperiences(true);
      setExperienceSearchError("");
      try {
        const params = new URLSearchParams({
          search: experienceQuery.trim(),
          limit: "5",
        });
        const response = await fetch(`${backendUrl}/experiences?${params}`, {
          signal: controller.signal,
        });
        const body = await response.text();
        const result = body ? JSON.parse(body) : [];
        if (!response.ok) {
          throw new Error(
            result.detail || `Experience search failed (${response.status}).`,
          );
        }
        setExperienceResults(result.slice(0, 5));
      } catch (error) {
        if (error.name !== "AbortError") {
          setExperienceSearchError(
            error.message || "Experience search failed.",
          );
          setExperienceResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingExperiences(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeForm, experienceDropdownOpen, experienceQuery]);

  useEffect(() => {
    if (activeForm !== "media" || !selectedFileName || !selectedFile) {
      return;
    }

    const controller = new AbortController();
    const inspectMedia = async () => {
      setIsInspectingMedia(true);
      setMediaInspection(null);
      setMediaInspectionError("");
      setExperienceQuery("");
      setExperienceResults([]);
      setSelectedExperience(null);
      setExperienceSearchError("");
      setExperienceDropdownOpen(false);
      try {
        const response = await fetch(`${backendUrl}/media-assets/info`, {
          method: "POST",
          headers: {
            "Content-Type": selectedFile.type || "application/octet-stream",
          },
          body: selectedFile,
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.detail || `Image inspection failed (${response.status}).`,
          );
        }
        setMediaInspection(result);
        const matchingExperiences = result.experiences || [];
        setExperienceResults(matchingExperiences);
        setSelectedExperience(
          matchingExperiences.length === 1 ? matchingExperiences[0] : null,
        );
        setExperienceDropdownOpen(matchingExperiences.length > 1);
        setMediaCapturedAt(
          result.captured_at ? formatDateInput(result.captured_at) : "",
        );
        setSelectedPlace(result.locations || null);
        setPlaceQuery("");
        setPlaceResults([]);
        setPlaceSearchError("");
      } catch (error) {
        if (error.name !== "AbortError") {
          setMediaInspectionError(
            error.message || "Could not read this image's information.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsInspectingMedia(false);
      }
    };

    inspectMedia();
    return () => controller.abort();
  }, [activeForm, selectedFileName, selectedFile]);

  const showSaveNotice = (notice) => {
    window.clearTimeout(noticeTimerRef.current);
    setSaveNotice(notice);
    if (notice.type === "success") {
      noticeTimerRef.current = window.setTimeout(() => {
        setSaveNotice(null);
      }, 2000);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault(); // stop page reload
    const req = Object.fromEntries(new FormData(e.target).entries()); // get all fields

    let url = "";
    let body = req;
    if (activeForm === "life-period") {
      if (!selectedPlace) {
        showSaveNotice({
          type: "error",
          status: "Location required",
          message: "Search for and select a city and country.",
        });
        return;
      }
      const startDate = parseDateInput(req["start_date*"]);
      const endDate = parseDateInput(req["end_date*"]);
      if (!startDate || !endDate) {
        showSaveNotice({
          type: "error",
          status: "Invalid date",
          message: "Enter dates in YYYY/MM/DD format.",
        });
        return;
      }

      body = {
        title: req.title,
        description: req.description || null,
        start_date: startDate,
        end_date: endDate,
        tag: req.tag || null,
        location: {
          city: selectedPlace.city,
          country: selectedPlace.country,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
        },
      };
      url = "http://127.0.0.1:8000/life-periods";
    } else if (activeForm === "experience") {
      const startDate = parseDateInput(req["start_date*"]);
      const endDate = parseDateInput(req["end_date*"]);
      if (!startDate || !endDate) {
        showSaveNotice({
          type: "error",
          status: "Invalid date",
          message: "Enter dates in YYYY/MM/DD format.",
        });
        return;
      }
      body = {
        title: req.title,
        life_period_id: selectedLifePeriod ? selectedLifePeriod.id : null,
        description: req.description || null,
        experience_type: req.experience_type || null,
        start_date: startDate,
        end_date: endDate,
        location: selectedPlace
          ? {
              city: selectedPlace.city,
              country: selectedPlace.country,
              latitude: selectedPlace.latitude,
              longitude: selectedPlace.longitude,
            }
          : null,
      };
      url = "http://127.0.0.1:8000/experiences";
    } else if (activeForm === "media") {
      const file = req.file;
      if (!(file instanceof File) || file.size === 0) {
        showSaveNotice({
          type: "error",
          status: "Image required",
          message: "Choose an image file to upload.",
        });
        return;
      }
      if (req.captured_at) {
        const capturedAt = parseDateInput(req.captured_at);
        if (!capturedAt) {
          showSaveNotice({
            type: "error",
            status: "Invalid date",
            message: "Enter the capture date in YYYY/MM/DD format.",
          });
          return;
        }
        req.captured_at = capturedAt;
      }

      const params = new URLSearchParams();
      for (const field of ["description", "captured_at", "location_id"]) {
        if (req[field]) params.set(field, req[field]);
      }
      if (selectedExperience) {
        params.set("experience_id", selectedExperience.id);
      }
      if (selectedPlace) {
        params.set("city", selectedPlace.city);
        params.set("country", selectedPlace.country);
        params.set("longitude", selectedPlace.longitude);
        params.set("latitude", selectedPlace.latitude);
      }
      url = `${backendUrl}/media-assets?${params.toString()}`;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        ...(activeForm === "media"
          ? {
              headers: {
                "Content-Type": req.file.type || "application/octet-stream",
              },
              body: req.file,
            }
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
      });
      const responseText = await res.text();
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { detail: responseText };
      }

      if (!res.ok) {
        const detail = result.detail ?? result.message;
        const message = Array.isArray(detail)
          ? detail
              .map((item) => {
                if (typeof item === "string") return item;
                const field = Array.isArray(item.loc)
                  ? item.loc.slice(1).join(" → ")
                  : "";
                return [field, item.msg || JSON.stringify(item)]
                  .filter(Boolean)
                  .join(": ");
              })
              .join("\n")
          : typeof detail === "string"
            ? detail
            : detail
              ? JSON.stringify(detail)
              : res.statusText || "The request could not be completed.";

        showSaveNotice({
          type: "error",
          status: `HTTP ${res.status}`,
          message,
        });
        return;
      }

      showSaveNotice({
        type: "success",
        message: result.message || "Your note was saved successfully.",
      });
    } catch (error) {
      showSaveNotice({
        type: "error",
        status: "Connection error",
        message: error.message || "Could not connect to the server.",
      });
    }
  }

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const form = activeForm ? fieldGroups[activeForm] : null;
  const accent = activeForm ? formAccents[activeForm] : formAccents.life;

  const selectForm = (formKey) => {
    setActiveForm(formKey);
    setTitleText(fieldGroups[formKey].title);
    setSelectedFileName("");
    setSelectedFile(null);
    setMediaInspection(null);
    setMediaInspectionError("");
    setIsInspectingMedia(false);
    setMediaCapturedAt("");
    setFormPosition({ x: 0, y: 0 });
    setPlaceQuery("");
    setPlaceResults([]);
    setSelectedPlace(null);
    setPlaceSearchError("");
    setIsSearchingPlaces(false);
    setLifePeriodQuery("");
    setLifePeriodDropdownOpen(false);
    setLifePeriodResults([]);
    setSelectedLifePeriod(null);
    setLifePeriodSearchError("");
    setIsSearchingLifePeriods(false);
    setExperienceQuery("");
    setExperienceDropdownOpen(false);
    setExperienceResults([]);
    setSelectedExperience(null);
    setExperienceSearchError("");
    setIsSearchingExperiences(false);
  };

  const handleFormPointerDown = (event) => {
    if (
      event.button !== 0 ||
      event.target.closest("input, textarea, button, [contenteditable='true']")
    ) {
      return;
    }

    dragStartRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX: formPosition.x,
      positionY: formPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleFormPointerMove = (event) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;

    setFormPosition({
      x: dragStart.positionX + event.clientX - dragStart.pointerX,
      y: dragStart.positionY + event.clientY - dragStart.pointerY,
    });
  };

  const finishFormDrag = (event) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
    }
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute top-0 left-0 z-80 w-full h-full font-roboto-slab"
    >
      <div className="pointer-events-auto absolute bottom-5 left-110">
        <div className="relative flex items-center gap-3">
          <div
            className={`flex items-center gap-2 transition-all duration-300 ${open ? "translate-x-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
          >
            {actions.map((action, index) => (
              <button
                key={action.key}
                type="button"
                aria-label={action.label}
                onClick={() => selectForm(action.key)}
                className={`group relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/70 ${action.className} text-white shadow-lg transition duration-300 hover:-translate-y-2 hover:scale-110 ${open ? "" : "delay-0"}`}
                style={{
                  left: ["135px", "135px", "135px"][index],
                  top: ["-35px", "-74px", "-35px"][index],
                  transitionDelay: open ? `${index * 70}ms` : "0ms",
                }}
              >
                <span
                  className={`${action.key === "experience" ? "text-[8px]" : "text-[10px]"} tracking-[0.12em] font-bold`}
                >
                  {action.label}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Add to chronicle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-[#e94f86] text-5xl text-white shadow-[0_10px_25px_rgba(94,22,52,0.35)] transition duration-300 hover:scale-110 hover:rotate-90 ${open ? "rotate-45" : ""}`}
          >
            <span className="relative top-[-2px]">+</span>
          </button>
        </div>
      </div>
      {saveNotice ? (
        <div
          role={saveNotice.type === "error" ? "alert" : "status"}
          className={`pointer-events-auto absolute right-5 top-5 z-100 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border px-4 py-3 shadow-[0_14px_35px_rgba(51,39,34,0.22)] backdrop-blur-md ${
            saveNotice.type === "success"
              ? "border-[#98b49b] bg-[#f1f8ef]/95 text-[#36543a]"
              : "border-[#d99a9f] bg-[#fff3f1]/95 text-[#66373b]"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-sans text-sm font-bold text-white ${
                saveNotice.type === "success" ? "bg-[#668b70]" : "bg-[#bf6970]"
              }`}
            >
              {saveNotice.type === "success" ? "✓" : "!"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-xs font-bold uppercase tracking-[0.14em]">
                {saveNotice.type === "success"
                  ? "Saved successfully"
                  : saveNotice.status}
              </p>
              <p className="mt-1 whitespace-pre-line wrap-break-word font-ribbon text-base leading-snug">
                {saveNotice.message}
              </p>
            </div>
            {saveNotice.type === "error" ? (
              <button
                type="button"
                aria-label="Close save error notice"
                onClick={() => {
                  window.clearTimeout(noticeTimerRef.current);
                  setSaveNotice(null);
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none opacity-70 transition hover:bg-black/5 hover:opacity-100"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {form && (
        <div
          className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-150 flex items-center justify-center p-4 z-10"
          style={{
            transform: `translate(${formPosition.x}px, ${formPosition.y}px)`,
          }}
        >
          <form
            onPointerDown={handleFormPointerDown}
            onPointerMove={handleFormPointerMove}
            onPointerUp={finishFormDrag}
            onPointerCancel={finishFormDrag}
            onSubmit={handleSubmit}
            className="relative w-full max-w-xl rounded-[24px] border border-white/80 bg-[#fff8f1] p-6 text-stone-800 shadow-2xl sm:p-6"
          >
            <button
              type="button"
              aria-label="Close form"
              onClick={() => setActiveForm(null)}
              className="absolute z-10 right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xl text-stone-600 transition hover:bg-stone-200"
            >
              ×
            </button>
            <div className="relative mb-1 w-full">
              <span
                aria-hidden="true"
                className={`absolute bottom-1 left-0 h-3 w-full -rotate-1 ${accent.marker}`}
              />
              <input
                aria-label={`${form.title} title`}
                value={titleText}
                onChange={(event) => setTitleText(event.target.value)}
                name="title"
                className={`relative w-full border-0 bg-transparent p-0 text-4xl font-bold outline-none focus:ring-0 ${accent.focus}`}
              />
            </div>

            {activeForm === "media" ? (
              <div className="mt-3 flex items-center gap-2">
                {/* input styling trick, hides the ugly file input but style a button, when clicked on the button, mediaFileInputRef which refer to the file input gets clicked to save file name  */}
                <input
                  ref={mediaFileInputRef}
                  id="media-file-upload"
                  name="file"
                  type="file"
                  accept="image/*"
                  required
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSelectedFileName(event.target.files?.[0]?.name || "");
                    setSelectedFile(file);
                    setMediaInspection(null);
                    setMediaInspectionError("");
                    setMediaCapturedAt("");
                    setExperienceQuery("");
                    setExperienceDropdownOpen(false);
                    setExperienceResults([]);
                    setSelectedExperience(null);
                    setExperienceSearchError("");
                    setSelectedPlace(null);
                    setPlaceQuery("");
                    setPlaceResults([]);
                    setPlaceSearchError("");
                  }}
                />
                <button
                  type="button"
                  onClick={() => mediaFileInputRef.current?.click()}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-sans text-xs font-semibold text-white transition ${accent.button}`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h6l1.5 1.5h9v10.5h-16.5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 8.25h16.5"
                    />
                  </svg>
                  Choose image
                </button>
                {selectedFileName ? (
                  <span
                    className="max-w-[14rem] truncate font-sans text-xs text-stone-500"
                    title={selectedFileName}
                  >
                    {selectedFileName}
                  </span>
                ) : null}
              </div>
            ) : null}

            {activeForm === "media" ? (
              <div className="mt-2 font-sans text-xs text-stone-600">
                {isInspectingMedia ? <p>Reading image information...</p> : null}
                {mediaInspectionError ? (
                  <p role="alert" className="text-red-700">
                    {mediaInspectionError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {form.fields.map((field) => (
                <label
                  key={field}
                  className={field === "Description" ? "sm:col-span-2" : ""}
                >
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                    {field}
                  </span>
                  {field === "Experience" && activeForm === "media" ? (
                    <div className="relative">
                      <input
                        autoComplete="off"
                        aria-label="Search experiences"
                        aria-controls="media-experience-results"
                        aria-expanded={experienceDropdownOpen}
                        className={`w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:ring-2 ${accent.focus}`}
                        onFocus={() => setExperienceDropdownOpen(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setExperienceDropdownOpen(false);
                          }
                        }}
                        onChange={(event) => {
                          setExperienceQuery(event.target.value);
                          setSelectedExperience(null);
                          setExperienceResults([]);
                          setExperienceSearchError("");
                          setIsSearchingExperiences(false);
                          setExperienceDropdownOpen(true);
                        }}
                        placeholder="Search experiences by title"
                        role="combobox"
                        value={selectedExperience?.title || experienceQuery}
                      />
                      {isSearchingExperiences ? (
                        <p className="mt-1 text-xs text-stone-500">
                          Searching...
                        </p>
                      ) : null}
                      {experienceSearchError ? (
                        <p role="alert" className="mt-1 text-xs text-red-700">
                          {experienceSearchError}
                        </p>
                      ) : null}
                      {experienceDropdownOpen &&
                      (experienceResults.length > 0 ||
                        (!experienceQuery.trim() &&
                          mediaInspection &&
                          !mediaInspection.experiences.length)) ? (
                        <ul
                          id="media-experience-results"
                          role="listbox"
                          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
                        >
                          {experienceResults.length > 0 ? (
                            experienceResults.map((experience) => (
                              <li key={experience.id}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={
                                    selectedExperience?.id === experience.id
                                  }
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() => {
                                    setSelectedExperience(experience);
                                    setExperienceQuery("");
                                    setExperienceResults([]);
                                    setExperienceSearchError("");
                                    setExperienceDropdownOpen(false);
                                  }}
                                  className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
                                  style={{ textAlign: "left" }}
                                >
                                  {experience.title}
                                </button>
                              </li>
                            ))
                          ) : (
                            <li className="px-3 py-2 text-sm text-stone-500">
                              No date matches. Search by title.
                            </li>
                          )}
                        </ul>
                      ) : null}
                    </div>
                  ) : field === "Life period" && activeForm === "experience" ? (
                    <div className="relative">
                      <input
                        autoComplete="off"
                        aria-label="Search life periods"
                        aria-controls="experience-life-period-results"
                        aria-expanded={lifePeriodDropdownOpen}
                        className={`w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:ring-2 ${accent.focus}`}
                        onFocus={() => setLifePeriodDropdownOpen(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setLifePeriodDropdownOpen(false);
                          }
                        }}
                        onChange={(event) => {
                          setLifePeriodQuery(event.target.value);
                          setSelectedLifePeriod(null);
                          setLifePeriodResults([]);
                          setLifePeriodSearchError("");
                          setIsSearchingLifePeriods(false);
                          setLifePeriodDropdownOpen(true);
                        }}
                        placeholder="Search life periods"
                        role="combobox"
                        value={selectedLifePeriod?.title || lifePeriodQuery}
                      />
                      {isSearchingLifePeriods ? (
                        <p className="mt-1 text-xs text-stone-500">
                          Searching...
                        </p>
                      ) : null}
                      {lifePeriodSearchError ? (
                        <p role="alert" className="mt-1 text-xs text-red-700">
                          {lifePeriodSearchError}
                        </p>
                      ) : null}
                      {lifePeriodDropdownOpen &&
                      lifePeriodResults.length > 0 ? (
                        <ul
                          id="experience-life-period-results"
                          role="listbox"
                          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
                        >
                          {lifePeriodResults.map((lifePeriod) => (
                            <li key={lifePeriod.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={
                                  selectedLifePeriod?.id === lifePeriod.id
                                }
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setSelectedLifePeriod(lifePeriod);
                                  setLifePeriodQuery("");
                                  setLifePeriodResults([]);
                                  setLifePeriodSearchError("");
                                  setLifePeriodDropdownOpen(false);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
                                style={{ textAlign: "left" }}
                              >
                                {lifePeriod.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : (field === "Location*" && activeForm === "life-period") ||
                    (field === "Location" &&
                      ["experience", "media"].includes(activeForm)) ? (
                    <div className="relative">
                      <input
                        autoComplete="off"
                        aria-label="Search for a city"
                        className={`w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:ring-2 ${accent.focus}`}
                        onChange={(event) => {
                          setPlaceQuery(event.target.value);
                          setSelectedPlace(null);
                          setPlaceResults([]);
                          setPlaceSearchError("");
                          setIsSearchingPlaces(false);
                        }}
                        placeholder="Search city"
                        role="combobox"
                        aria-expanded={placeResults.length > 0}
                        aria-controls="place-search-results"
                        value={
                          selectedPlace
                            ? `${selectedPlace.city}, ${selectedPlace.country}`
                            : placeQuery
                        }
                      />
                      {isSearchingPlaces ? (
                        <p className="mt-1 text-xs text-stone-500">
                          Searching...
                        </p>
                      ) : null}
                      {placeSearchError ? (
                        <p role="alert" className="mt-1 text-xs text-red-700">
                          {placeSearchError}
                        </p>
                      ) : null}
                      {placeResults.length > 0 ? (
                        <ul
                          id="place-search-results"
                          role="listbox"
                          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
                        >
                          {placeResults.map((place, index) => (
                            <li key={`${place.city}-${place.country}-${index}`}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                onClick={() => {
                                  setSelectedPlace(place);
                                  setPlaceQuery("");
                                  setPlaceResults([]);
                                  setPlaceSearchError("");
                                }}
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
                                style={{ textAlign: "left" }}
                              >
                                {place.city}, {place.country}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : field === "Description" ? (
                    <textarea
                      name="description"
                      className={`min-h-24 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:ring-2 ${accent.focus}`}
                      placeholder={`Add ${field.toLowerCase()}`}
                    />
                  ) : (
                    <input
                      name={`${field.toLowerCase().replace(/ /g, "_")}`}
                      className={`w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:ring-2 ${accent.focus}`}
                      type="text"
                      inputMode={
                        field.toLowerCase().includes("date")
                          ? "numeric"
                          : undefined
                      }
                      placeholder={
                        field.toLowerCase().includes("date")
                          ? "YYYY/MM/DD"
                          : `Add ${field.toLowerCase()}`
                      }
                      value={
                        field === "Captured at" && activeForm === "media"
                          ? mediaCapturedAt
                          : undefined
                      }
                      onChange={
                        field === "Captured at" && activeForm === "media"
                          ? (event) => setMediaCapturedAt(event.target.value)
                          : undefined
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            <button
              type="submit"
              className={`mt-6 w-full rounded-full px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-white transition ${accent.button}`}
            >
              Save note
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
