"use client";

import React, { useRef, useState } from "react";
import { formatDateRangeInput, parseDateRangeInput } from "./dateInput";
import { mediaUrl } from "./mediaUrl";

const API_BASE = "http://127.0.0.1:8000";

const markerColors = [
  "bg-[#FFCAD4]",
  "bg-[#FFF275]",
  "bg-[#B2F7EF]",
  "bg-[#FBC490]",
  "bg-[#D8B4F8]",
];

const textColors = ["text-[#307b9c]", "text-[#1a385d]"];

const readResponse = async (response) => {
  const body = await response.text();
  let result = null;

  if (body) {
    try {
      result = JSON.parse(body);
    } catch {
      result = body;
    }
  }

  if (!response.ok) {
    const detail = result?.detail ?? result?.message;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg || JSON.stringify(item)).join(", ")
          : response.statusText || "The request could not be completed.";
    throw new Error(message);
  }

  return result;
};

const sendUpdate = async (path, data) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readResponse(response);
};

const optionalText = (value) => value?.trim() || null;

const LocationSummary = ({
  hoveredLocationSummary,
  onClose,
  onMouseEnter,
  onSummaryChange,
  dateRangeQuery = "",
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(hoveredLocationSummary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notePosition, setNotePosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef(null);

  if (!hoveredLocationSummary) return null;
  const content = editing ? draft : hoveredLocationSummary;
  if (!content) return null;

  const updateLifePeriod = (lifePeriodId, key, value) => {
    setDraft((current) => ({
      ...current,
      life_periods: current.life_periods.map((lifePeriod) =>
        lifePeriod.id === lifePeriodId
          ? { ...lifePeriod, [key]: value }
          : lifePeriod,
      ),
    }));
  };

  const updateExperience = (lifePeriodId, experienceId, key, value) => {
    setDraft((current) => ({
      ...current,
      life_periods: current.life_periods.map((lifePeriod) =>
        lifePeriod.id === lifePeriodId
          ? {
              ...lifePeriod,
              experiences: lifePeriod.experiences.map((experience) =>
                experience.id === experienceId
                  ? { ...experience, [key]: value }
                  : experience,
              ),
            }
          : lifePeriod,
      ),
    }));
  };

  const updateMediaAsset = (
    lifePeriodId,
    experienceId,
    mediaAssetId,
    key,
    value,
  ) => {
    setDraft((current) => ({
      ...current,
      life_periods: current.life_periods.map((lifePeriod) =>
        lifePeriod.id === lifePeriodId
          ? {
              ...lifePeriod,
              experiences: lifePeriod.experiences.map((experience) =>
                experience.id === experienceId
                  ? {
                      ...experience,
                      media_assets: experience.media_assets.map((media) =>
                        media.id === mediaAssetId
                          ? { ...media, [key]: value }
                          : media,
                      ),
                    }
                  : experience,
              ),
            }
          : lifePeriod,
      ),
    }));
  };

  const refreshSummary = async (locationId) => {
    const query = dateRangeQuery ? `?${dateRangeQuery}` : "";
    const response = await fetch(
      `${API_BASE}/locations/${locationId}/summary${query}`,
      { cache: "no-store" },
    );
    return readResponse(response);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const dateRanges = new Map();
    for (const lifePeriod of draft.life_periods) {
      const dateRange = lifePeriod.date_range
        ? parseDateRangeInput(lifePeriod.date_range)
        : {
            start_date: lifePeriod.start_date,
            end_date: lifePeriod.end_date,
          };
      if (!dateRange) {
        setError(
          `Enter the dates for "${lifePeriod.title}" as YYYY/MM/DD - YYYY/MM/DD.`,
        );
        return;
      }
      dateRanges.set(lifePeriod.id, dateRange);

      for (const experience of lifePeriod.experiences) {
        const experienceDateRange = experience.date_range
          ? parseDateRangeInput(experience.date_range)
          : {
              start_date: experience.start_date,
              end_date: experience.end_date,
            };
        if (!experienceDateRange) {
          setError(
            `Enter the dates for "${experience.title}" as YYYY/MM/DD - YYYY/MM/DD.`,
          );
          return;
        }
        dateRanges.set(`experience-${experience.id}`, experienceDateRange);
      }
    }

    setBusy(true);
    setError("");

    try {
      const { location, life_periods: lifePeriods } = draft;

      for (const lifePeriod of lifePeriods) {
        const dateRange = dateRanges.get(lifePeriod.id);
        await sendUpdate(`/life-periods/${lifePeriod.id}`, {
          title: lifePeriod.title,
          description: optionalText(lifePeriod.description),
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
          tag: optionalText(lifePeriod.tag),
        });

        for (const experience of lifePeriod.experiences) {
          const experienceDateRange = dateRanges.get(
            `experience-${experience.id}`,
          );
          await sendUpdate(`/experiences/${experience.id}`, {
            title: experience.title,
            description: optionalText(experience.description),
            experience_type: optionalText(experience.experience_type),
            start_date: experienceDateRange.start_date,
            end_date: experienceDateRange.end_date,
          });

          for (const media of experience.media_assets) {
            await sendUpdate(`/media-assets/${media.id}`, {
              title: optionalText(media.title),
            });
          }
        }
      }

      const updatedSummary = await refreshSummary(location.id);
      onSummaryChange(updatedSummary);
      setEditing(false);
    } catch (saveError) {
      setError(saveError.message || "Unable to save this location summary.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (kind, id, locationId) => {
    const confirmation =
      kind === "life-period"
        ? "Delete this life period and its experiences and media?"
        : "Delete this experience and its media?";
    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE}/${kind === "life-period" ? "life-periods" : "experiences"}/${id}`,
        {
          method: "DELETE",
        },
      );
      await readResponse(response);
      const updatedSummary = await refreshSummary(locationId);
      onSummaryChange(updatedSummary);
      setDraft(updatedSummary);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete this item.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMedia = async (mediaId, locationId) => {
    if (!window.confirm("Delete this picture?")) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/media-assets/${mediaId}`, {
        method: "DELETE",
      });
      await readResponse(response);
      const updatedSummary = await refreshSummary(locationId);
      onSummaryChange(updatedSummary);
      setDraft(updatedSummary);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete this picture.");
    } finally {
      setBusy(false);
    }
  };

  const cancelEditing = () => {
    setDraft(hoveredLocationSummary);
    setEditing(false);
    setError("");
  };

  const { location, life_periods: lifePeriods = [] } = content;

  const handlePointerDown = (event) => {
    if (
      event.button !== 0 ||
      event.target.closest("button, input, textarea, select, a")
    ) {
      return;
    }

    dragStartRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX: notePosition.x,
      positionY: notePosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;

    setNotePosition({
      x: dragStart.positionX + event.clientX - dragStart.pointerX,
      y: dragStart.positionY + event.clientY - dragStart.pointerY,
    });
  };

  const finishDragging = (event) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
    }
  };

  return (
    <div
      className="pointer-events-auto absolute right-4 top-6 z-50 cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDragging}
      onPointerCancel={finishDragging}
      onMouseEnter={onMouseEnter}
      style={{
        transform: `translate(${notePosition.x}px, ${notePosition.y}px)`,
      }}
    >
      <img
        src="/tape.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-30px] z-20 h-fit -translate-x-1/2 object-contain opacity-80"
      />
      <div
        className="relative h-135 w-105 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-[#d99a9f] bg-[#fff8f5] shadow-[8px_10px_0_rgba(105,40,48,0.16),0_20px_35px_rgba(52,36,17,0.2)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(202,91,106,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(202,91,106,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 20px, 20px 100%",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[rgba(255,250,248,0.34)]" />

        <form
          onSubmit={handleSave}
          className="relative flex h-full flex-col px-7 py-6"
        >
          <div className="flex items-start justify-between gap-2 border-b-2 border-dashed border-[#9e4d58]/55 pb-4 pr-10">
            <h2 className="min-w-0 flex-1 font-alegreya text-[2rem] font-bold leading-[0.82] tracking-tight">
              {location?.city || "Unknown city"},{" "}
              {location?.country || "Unknown country"}
            </h2>
            <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
              {editing ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={cancelEditing}
                  aria-label="Cancel summary edits"
                  title="Cancel"
                  className="flex h-8 items-center justify-center rounded-full border border-[#8d4650]/35 bg-white/90 px-3 text-xs font-bold text-[#71353e] shadow-sm transition hover:bg-white disabled:opacity-50"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraft(hoveredLocationSummary);
                    setError("");
                    setEditing(true);
                  }}
                  aria-label="Edit location summary"
                  title="Edit location summary"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8d4650]/35 bg-[#fff8f5]/90 text-[#71353e] shadow-sm transition hover:bg-white disabled:opacity-50"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="m13.9 3.6 2.5 2.5M4 16l3.2-.7L16 6.5a1.8 1.8 0 0 0-2.5-2.5L4.7 12.8 4 16Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                    />
                  </svg>
                </button>
              )}
              {editing ? (
                <button
                  type="submit"
                  disabled={busy}
                  aria-label={busy ? "Saving summary" : "Save summary"}
                  title={busy ? "Saving..." : "Save"}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#71353e] text-white shadow-sm transition hover:bg-[#8d4650] disabled:opacity-50"
                >
                  {busy ? (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                  ) : (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                    >
                      <path
                        d="M4 3.5h10.8L17 5.7v10.8H3V3.5h1Zm2 0v5h8v-5M6 16v-5h8v5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close location summary"
                title="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8d4650]/35 bg-[#fff8f5]/85 font-sans text-xl leading-none text-[#71353e] shadow-sm transition hover:bg-white"
              >
                ×
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
            {lifePeriods.map((lifePeriod, lifeIndex) => {
              const originalLifePeriod =
                hoveredLocationSummary.life_periods.find(
                  (original) => original.id === lifePeriod.id,
                );
              return (
                <section
                  key={`life-period-${lifePeriod.id}`}
                  className="font-roboto-slab"
                >
                  <div className="relative flex items-center justify-between gap-2 w-full">
                    <div
                      className={`flex-1 min-w-0 flex -rotate-1 text-xl font-bold leading-none w-full ${
                        markerColors[lifeIndex % markerColors.length]
                      } ${editing ? "pr-8" : ""}`}
                    >
                      <span aria-hidden="true" className="px-1">
                        •
                      </span>
                      <textarea
                        aria-label="Life period title"
                        className="flex-1 min-w-0 w-full resize-none p-0 m-0 alignment-baseline bg-transparent text-inherit outline-none placeholder:text-current/60 focus:ring-1 focus:ring-[#9e4d58]/40 [field-sizing:content] [scrollbar-width:none]"
                        onChange={(event) =>
                          updateLifePeriod(
                            lifePeriod.id,
                            "title",
                            event.target.value,
                          )
                        }
                        placeholder="Untitled life period"
                        readOnly={!editing}
                        type="text"
                        value={lifePeriod.title ?? ""}
                      />
                      {originalLifePeriod?.tag ? (
                        <input
                          aria-label="Life period tag"
                          className={`ml-auto min-w-0 w-auto shrink-0 border-b-2 border-[#6b806a]/50 bg-transparent px-1 font-sans text-[9px] font-bold uppercase tracking-[0.12em] outline-none focus:border-[#9e4d58] [field-sizing:content] ${textColors[0]}`}
                          onChange={(event) =>
                            updateLifePeriod(
                              lifePeriod.id,
                              "tag",
                              event.target.value,
                            )
                          }
                          readOnly={!editing}
                          type="text"
                          value={lifePeriod.tag}
                        />
                      ) : null}
                    </div>
                    {editing ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleDelete(
                            "life-period",
                            lifePeriod.id,
                            location.id,
                          )
                        }
                        aria-label={`Delete life period ${lifePeriod.title}`}
                        className="absolute right-0 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-base text-[#71353e] disabled:opacity-50"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>

                  <div className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-[calc(100%-0.5rem)] before:w-[2px] before:bg-[#9e4d58]/45">
                    <div className="space-y-2">
                      <input
                        aria-label="Life period dates"
                        className={`w-full p-0 m-0 alignment-baseline bg-transparent font-caveat text-lg font-bold outline-none focus:ring-1 focus:ring-[#9e4d58]/40 ${textColors[0]}`}
                        onChange={(event) =>
                          updateLifePeriod(
                            lifePeriod.id,
                            "date_range",
                            event.target.value,
                          )
                        }
                        readOnly={!editing}
                        type="text"
                        value={
                          lifePeriod.date_range ??
                          formatDateRangeInput(
                            lifePeriod.start_date,
                            lifePeriod.end_date,
                          )
                        }
                      />

                      {originalLifePeriod?.description ? (
                        <textarea
                          aria-label="Life period description"
                          className={`w-full resize-none bg-transparent text-base leading-[1.2] outline-none focus:ring-1 [field-sizing:content] [scrollbar-width:none] focus:ring-[#9e4d58]/40 ${textColors[1]}`}
                          onChange={(event) =>
                            updateLifePeriod(
                              lifePeriod.id,
                              "description",
                              event.target.value,
                            )
                          }
                          readOnly={!editing}
                          rows={2}
                          value={lifePeriod.description}
                        />
                      ) : null}

                      {lifePeriod.experiences.length > 0 ? (
                        <div className="space-y-3">
                          {lifePeriod.experiences.map((experience) => {
                            const originalExperience =
                              originalLifePeriod?.experiences.find(
                                (original) => original.id === experience.id,
                              );
                            return (
                              <article
                                key={`experience-${experience.id}`}
                                className="border-t border-[#789078]/40 pt-2"
                              >
                                <div className="relative flex items-start justify-between gap-2 pr-8">
                                  <div
                                    className={`min-w-0 flex-1 ${editing ? "pr-8" : ""}`}
                                  >
                                    <input
                                      aria-label="Experience title"
                                      className="w-full bg-transparent text-lg font-bold leading-none outline-none focus:ring-1 focus:ring-[#9e4d58]/40"
                                      onChange={(event) =>
                                        updateExperience(
                                          lifePeriod.id,
                                          experience.id,
                                          "title",
                                          event.target.value,
                                        )
                                      }
                                      readOnly={!editing}
                                      type="text"
                                      value={
                                        experience.title ||
                                        "Untitled experience"
                                      }
                                    />
                                  </div>
                                  {editing ? (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        handleDelete(
                                          "experience",
                                          experience.id,
                                          location.id,
                                        )
                                      }
                                      aria-label={`Delete experience ${experience.title}`}
                                      className="absolute right-0 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-base text-[#71353e] disabled:opacity-50"
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </div>
                                <input
                                  aria-label="Experience dates"
                                  className={`mt-0.5 w-full bg-transparent font-caveat text-base font-bold outline-none focus:ring-1 focus:ring-[#9e4d58]/40 ${textColors[0]}`}
                                  onChange={(event) =>
                                    updateExperience(
                                      lifePeriod.id,
                                      experience.id,
                                      "date_range",
                                      event.target.value,
                                    )
                                  }
                                  readOnly={!editing}
                                  type="text"
                                  value={
                                    experience.date_range ??
                                    formatDateRangeInput(
                                      experience.start_date,
                                      experience.end_date,
                                    )
                                  }
                                />
                                {originalExperience?.experience_type ? (
                                  <div
                                    className={`mt-1 flex items-baseline font-sans text-[8px] font-bold uppercase tracking-[0.12em] ${textColors[0]}`}
                                  >
                                    <span aria-hidden="true"># </span>
                                    <input
                                      aria-label="Experience type"
                                      className="min-w-0 flex-1 bg-transparent font-sans text-[8px] font-bold uppercase tracking-[0.12em] text-inherit outline-none focus:ring-1 focus:ring-[#9e4d58]/40"
                                      onChange={(event) =>
                                        updateExperience(
                                          lifePeriod.id,
                                          experience.id,
                                          "experience_type",
                                          event.target.value,
                                        )
                                      }
                                      readOnly={!editing}
                                      type="text"
                                      value={experience.experience_type}
                                    />
                                  </div>
                                ) : null}
                                {originalExperience?.description ? (
                                  <textarea
                                    aria-label="Experience description"
                                    className={`mt-0.5 w-full resize-none bg-transparent text-sm leading-tight outline-none focus:ring-1 focus:ring-[#9e4d58]/40 [field-sizing:content] [scrollbar-width:none] ${textColors[1]}`}
                                    onChange={(event) =>
                                      updateExperience(
                                        lifePeriod.id,
                                        experience.id,
                                        "description",
                                        event.target.value,
                                      )
                                    }
                                    readOnly={!editing}
                                    rows={2}
                                    value={experience.description}
                                  />
                                ) : null}

                                {experience.media_assets?.length > 0 ? (
                                  <div className="mt-1 grid grid-cols-3 gap-2">
                                    {experience.media_assets.map((media) => (
                                      <div
                                        key={`media-asset-${media.id}`}
                                        className="min-w-0"
                                      >
                                        <figure className="w-full -rotate-2 bg-white p-1.5 shadow-[1px_3px_5px_rgba(42,55,42,0.2)]">
                                          <div className="relative">
                                            <img
                                              src={mediaUrl(media.file_url)}
                                              alt={
                                                media.title || "Travel memory"
                                              }
                                              className="aspect-square w-full object-cover"
                                            />
                                            {editing ? (
                                              <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() =>
                                                  handleDeleteMedia(
                                                    media.id,
                                                    location.id,
                                                  )
                                                }
                                                aria-label={`Delete picture ${media.title || "without a title"}`}
                                                title="Delete picture"
                                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-base leading-none text-[#71353e] shadow transition hover:bg-white disabled:opacity-50"
                                              >
                                                ×
                                              </button>
                                            ) : null}
                                          </div>
                                          <input
                                            aria-label="Media title"
                                            className="w-full bg-transparent text-center text-sm font-bold outline-none focus:ring-1 focus:ring-[#9e4d58]/40"
                                            disabled={busy}
                                            readOnly={!editing}
                                            onChange={(event) =>
                                              updateMediaAsset(
                                                lifePeriod.id,
                                                experience.id,
                                                media.id,
                                                "title",
                                                event.target.value,
                                              )
                                            }
                                            type="text"
                                            value={media.title || ""}
                                          />
                                        </figure>
                                        {!editing && media.description ? (
                                          <p
                                            className={`mt-1 text-xs ${textColors[1]}`}
                                          >
                                            {media.description}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationSummary;
