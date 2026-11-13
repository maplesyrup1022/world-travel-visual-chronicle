import React from "react";
import Link from "next/link";
import Report from "./Report";
import { mediaUrl } from "./mediaUrl";

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return "Date unknown";
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate;
};

const formatDate = (value) => new Date(value).toLocaleDateString();

const metrics = [
  { key: "life_periods", label: "Life periods", color: "#d9a94f" },
  { key: "experiences", label: "Experiences", color: "#d98689" },
  { key: "media_assets", label: "Memories", color: "#7a9b7e" },
  { key: "cities_visited", label: "Cities", color: "#7993ae" },
  { key: "countries_visited", label: "Countries", color: "#ae89a7" },
];

const lifePeriodColors = [
  {
    title: "bg-[#f3d9df]/90",
    marker: "bg-[#c45e7d]",
    markerShadow: "shadow-[0_0_0_1px_rgba(196,94,125,0.35)]",
  },
  {
    title: "bg-[#f5e6b8]/90",
    marker: "bg-[#c49b3f]",
    markerShadow: "shadow-[0_0_0_1px_rgba(196,155,63,0.35)]",
  },
  {
    title: "bg-[#d8eee4]/90",
    marker: "bg-[#5f9b7b]",
    markerShadow: "shadow-[0_0_0_1px_rgba(95,155,123,0.35)]",
  },
  {
    title: "bg-[#dce8f5]/90",
    marker: "bg-[#6589b5]",
    markerShadow: "shadow-[0_0_0_1px_rgba(101,137,181,0.35)]",
  },
  {
    title: "bg-[#e8def5]/90",
    marker: "bg-[#8a70b0]",
    markerShadow: "shadow-[0_0_0_1px_rgba(138,112,176,0.35)]",
  },
];

const Chronicle = ({
  chronicle = [],
  stats = {},
  periodLabel = "All dates",
  querySuffix = "",
}) => {
  const lifePeriods = chronicle;

  return (
    <main className="min-h-screen bg-[#fcfbfa] px-10 py-8 text-[#48343a] sm:px-70 sm:py-12">
      <div
        className="mx-auto max-w-6xl overflow-hidden rounded-md border border-[#eadde0] bg-[#fffefd] shadow-[0_18px_55px_rgba(117,59,76,0.12)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(194,90,120,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(194,90,120,0.045) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="bg-[rgba(255,254,253,0.86)] px-5 py-7 sm:px-10 sm:py-8">
          <header className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-dashed border-[#bd7188]/45 pb-6">
            <div>
              <h1 className="font-alegreya text-4xl font-bold leading-none text-[#593744] sm:text-5xl">
                {periodLabel} Chronicle
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-[#bd7188]/50 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#845566] transition hover:bg-[#bd7188]/10"
              >
                Back to map
              </Link>
            </div>
          </header>

          <section aria-labelledby="timeline-heading" className="pb-8 pt-2">
            {lifePeriods.length ? (
              <div className="relative ml-2 border-l-2 border-[#d6a0b0]/70 pl-6 sm:ml-5 sm:pl-9">
                {lifePeriods.map(
                  (
                    {
                      id,
                      title,
                      description,
                      start_date,
                      end_date,
                      tag,
                      location,
                      experiences = [],
                    },
                    periodIndex,
                  ) => {
                    const colors =
                      lifePeriodColors[periodIndex % lifePeriodColors.length];

                    return (
                      <article
                        key={`life-period-${id}`}
                        className="relative pb-9 last:pb-0"
                      >
                        <span
                          className={`absolute -left-8.5 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#fff9f8] ${colors.marker} ${colors.markerShadow} sm:-left-11.5`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                        <div className="mb-3 flex flex-wrap items-start gap-3">
                          <div>
                            <p className="font-caveat text-2xl font-bold text-[#9b6877]">
                              {formatDateRange(start_date, end_date)}
                            </p>
                            <h3
                              className={`mt-1 inline-block rotate-[-0.5deg] px-2 py-0.5 font-roboto-slab text-2xl font-bold leading-tight text-[#593744] ${colors.title}`}
                            >
                              {title || "Untitled chapter"}
                            </h3>
                          </div>
                          <div className="ml-auto flex flex-col items-end gap-1 text-right">
                            <p className="font-roboto-slab text-xl font-bold leading-tight text-[#845566] sm:text-2xl">
                              {location.city}, {location.country}
                            </p>
                            {tag ? (
                              <span className="border-b-2 border-[#d58a9b]/65 px-1 font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#945666]">
                                {tag}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {description ? (
                          <p className="max-w-3xl whitespace-pre-line font-roboto-slab text-base leading-relaxed text-[#735b63]">
                            {description}
                          </p>
                        ) : null}

                        {experiences.length ? (
                          <div className="mt-5 space-y-5 border-l border-dashed border-[#dfb8c3] pl-4 sm:ml-2 sm:pl-6">
                            {experiences.map((experience, experienceIndex) => (
                              <section
                                key={`experience-${experience.id}`}
                                className="relative"
                              >
                                <span className="absolute -left-5.25 top-1.5 h-2 w-2 rounded-full bg-[#d28c9a] ring-4 ring-[#fff9f8]/80 sm:-left-7.25" />
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                  <h4 className="font-roboto-slab text-xl font-bold text-[#593744]">
                                    {experience.title || "Untitled experience"}
                                  </h4>
                                  <span className="font-caveat text-base font-semibold uppercase text-[#9b7d85]">
                                    {formatDateRange(
                                      experience.start_date,
                                      experience.end_date,
                                    )}
                                  </span>
                                </div>
                                {experience.experience_type ? (
                                  <span className="mt-1 inline-block bg-[#f4dce3]/90 px-2 py-0.5 font-sans text-[8px] font-bold uppercase tracking-[0.14em] text-[#94566b]">
                                    # {experience.experience_type}
                                  </span>
                                ) : null}
                                {experience.description ? (
                                  <p className="mt-1 max-w-3xl whitespace-pre-line font-roboto-slab text-[0.98rem] leading-relaxed text-[#806d73]">
                                    {experience.description}
                                  </p>
                                ) : null}
                                {experience.media_assets?.length ? (
                                  <div className="mt-3 flex flex-wrap gap-4">
                                    {experience.media_assets.map((media) => (
                                      <figure
                                        key={`media-${media.id}`}
                                        className={`w-32 bg-white p-2 pb-5 shadow-[1px_4px_8px_rgba(91,53,66,0.17)] ${experienceIndex % 2 ? "rotate-2" : "-rotate-2"}`}
                                      >
                                        <img
                                          src={mediaUrl(media.file_url)}
                                          alt={media.title || "Travel memory"}
                                          className="aspect-square w-full object-cover"
                                        />
                                        <figcaption className="mt-1 truncate text-center font-roboto-slab text-sm text-[#78636a]">
                                          {media.title ||
                                            (media.captured_at
                                              ? formatDate(media.captured_at)
                                              : "A small memory")}
                                        </figcaption>
                                      </figure>
                                    ))}
                                  </div>
                                ) : null}
                              </section>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 font-roboto-slab text-sm italic text-[#9b7d85]">
                            No experiences recorded in this chapter.
                          </p>
                        )}
                        {periodIndex < lifePeriods.length - 1 ? (
                          <div className="mt-8 border-b border-dotted border-[#dfbdc7]/75" />
                        ) : null}
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <p className="border-l-2 border-[#d6a0b0]/70 py-3 pl-5 font-roboto-slab text-lg italic text-[#9b7d85]">
                Your next chapter is waiting to be written.
              </p>
            )}
          </section>
          <div className="my-2 py-3">
            <Report querySuffix={querySuffix} periodLabel={periodLabel} />
          </div>
          <div className="mb-6 border-b border-[#dfbdc7]/70 pb-3" />

          <section aria-labelledby="totals-heading" className="py-7">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2
                  id="totals-heading"
                  className="font-alegreya text-2xl font-bold text-[#593744]"
                >
                  Your collected pages
                </h2>
              </div>
            </div>

            <dl className="grid grid-cols-2 border-y border-[#dfbdc7]/75 sm:grid-cols-3 lg:grid-cols-5">
              {metrics.map(({ key, label, color }) => (
                <div
                  key={key}
                  className="border-b border-r border-[#e6c6d0]/80 px-4 py-4 last:border-r-0 sm:border-b-0"
                >
                  <dt className="font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#8f727b]">
                    {label}
                  </dt>
                  <dd
                    className="mt-1 font-caveat text-4xl font-bold leading-none"
                    style={{ color }}
                  >
                    {Number(stats[key]) || 0}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <h3 className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[#8f727b]">
                Experience types
              </h3>
              {stats.experience_type_agg?.length ? (
                stats.experience_type_agg.map(({ experience_type, count }) => (
                  <p
                    key={experience_type || "Uncategorized"}
                    className="font-roboto-slab text-base text-[#845566]"
                  >
                    <span className="mr-1 text-[#c45e7d]">✳</span>
                    {experience_type || "Uncategorized"}
                    <strong className="ml-2 font-caveat text-sm font-bold text-[#48343a]">
                      {Number(count) || 0}
                    </strong>
                  </p>
                ))
              ) : (
                <p className="font-roboto-slab text-base italic text-[#9b7d85]">
                  No experiences recorded yet
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Chronicle;
