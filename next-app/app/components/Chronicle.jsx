import React from "react";
import Link from "next/link";
import Report from "./Report";

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return "Date unknown";
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate;
};

const metrics = [
  { key: "life_periods", label: "Life periods", color: "#d9a94f" },
  { key: "experiences", label: "Experiences", color: "#d98689" },
  { key: "media_assets", label: "Memories", color: "#7a9b7e" },
  { key: "cities_visited", label: "Cities", color: "#7993ae" },
  { key: "countries_visited", label: "Countries", color: "#ae89a7" },
];

const Chronicle = ({ chronicle = [], stats = {}, year }) => {
  const totalMemories = Number(stats.media_assets) || 0;

  return (
    <main className="min-h-screen bg-[#e4e4e1] px-10 py-8 text-[#303a32] sm:px-70 sm:py-12">
      <div
        className="mx-auto max-w-6xl overflow-hidden rounded-md border border-[#cbd0be] bg-[#fbfaf1] shadow-[0_18px_55px_rgba(57,68,51,0.16)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(111,145,112,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(111,145,112,0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="bg-[rgba(251,250,241,0.72)] px-5 py-7 sm:px-10 sm:py-8">
          <header className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-dashed border-[#75856f]/45 pb-6">
            <div>
              <h1 className="font-alegreya text-4xl font-bold leading-none text-[#29392f] sm:text-5xl">
                YEAR <span className="text-5xl sm:text-6xl">{year}</span>{" "}
                Chronicle
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-[#788675]/50 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#526451] transition hover:bg-[#788675]/10"
              >
                Back to map
              </Link>
            </div>
          </header>

          <section aria-labelledby="timeline-heading" className="pb-8 pt-2">
            {chronicle.length ? (
              <div className="relative ml-2 border-l-2 border-[#8ca18a]/65 pl-6 sm:ml-5 sm:pl-9">
                {chronicle.map(
                  (
                    {
                      id,
                      title,
                      description,
                      start_date,
                      end_date,
                      tag,
                      experiences = [],
                    },
                    periodIndex,
                  ) => {
                    return (
                      <article
                        key={`life-period-${id}`}
                        className="relative pb-9 last:pb-0"
                      >
                        <span className="absolute -left-8.5 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#fbfaf1] bg-[#718a70] shadow-[0_0_0_1px_rgba(113,138,112,0.35)] sm:-left-11.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-caveat text-2xl font-bold text-[#778574]">
                              {formatDateRange(start_date, end_date)}
                            </p>
                            <h3 className="mt-1 inline-block rotate-[-0.5deg] bg-[#e8d99b]/75 px-2 py-0.5 font-roboto-slab text-2xl font-bold leading-tight text-[#334337]">
                              {title || "Untitled chapter"}
                            </h3>
                          </div>
                          {tag ? (
                            <span className="mt-1 border-b-2 border-[#d58a82]/65 px-1 font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#8d6059]">
                              {tag}
                            </span>
                          ) : null}
                        </div>
                        {description ? (
                          <p className="max-w-3xl font-roboto-slab text-base leading-relaxed text-[#536354]">
                            {description}
                          </p>
                        ) : null}

                        {experiences.length ? (
                          <div className="mt-5 space-y-5 border-l border-dashed border-[#a1ad9a] pl-4 sm:ml-2 sm:pl-6">
                            {experiences.map((experience, experienceIndex) => (
                              <section
                                key={`experience-${experience.id}`}
                                className="relative"
                              >
                                <span className="absolute -left-5.25 top-1.5 h-2 w-2 rounded-full bg-[#d28c86] ring-4 ring-[#fbfaf1]/80 sm:-left-7.25" />
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                  <h4 className="font-roboto-slab text-xl font-bold text-[#39483c]">
                                    {experience.title || "Untitled experience"}
                                  </h4>
                                  <span className="font-caveat text-base font-semibold uppercase text-[#89907e]">
                                    {formatDateRange(
                                      experience.start_date,
                                      experience.end_date,
                                    )}
                                  </span>
                                </div>
                                {experience.experience_type ? (
                                  <span className="mt-1 inline-block bg-[#d9e5d3]/80 px-2 py-0.5 font-sans text-[8px] font-bold uppercase tracking-[0.14em] text-[#5c765e]">
                                    # {experience.experience_type}
                                  </span>
                                ) : null}
                                {experience.description ? (
                                  <p className="mt-1 max-w-3xl font-roboto-slab text-[0.98rem] leading-relaxed text-[#687568]">
                                    {experience.description}
                                  </p>
                                ) : null}
                                {experience.media_assets?.length ? (
                                  <div className="mt-3 flex flex-wrap gap-4">
                                    {experience.media_assets.map((media) => (
                                      <figure
                                        key={`media-${media.id}`}
                                        className={`w-32 bg-white p-2 pb-5 shadow-[1px_4px_8px_rgba(51,62,48,0.17)] ${experienceIndex % 2 ? "rotate-2" : "-rotate-2"}`}
                                      >
                                        <img
                                          src={media.file_url}
                                          alt={media.title || "Travel memory"}
                                          className="aspect-square w-full object-cover"
                                        />
                                        <figcaption className="mt-1 truncate text-center font-ribbon text-sm text-[#657266]">
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
                          <p className="mt-3 font-ribbon text-sm italic text-[#89907e]">
                            No experiences recorded in this chapter.
                          </p>
                        )}
                        {periodIndex < chronicle.length - 1 ? (
                          <div className="mt-8 border-b border-dotted border-[#aeb8a5]/75" />
                        ) : null}
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <p className="border-l-2 border-[#8ca18a]/65 py-3 pl-5 font-ribbon text-lg italic text-[#89907e]">
                Your next chapter is waiting to be written.
              </p>
            )}
          </section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#aeb8a5]/60 pb-3"></div>

          <section aria-labelledby="totals-heading" className="py-7">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2
                  id="totals-heading"
                  className="font-ribbon text-2xl font-bold text-[#354338]"
                >
                  Your collected pages
                </h2>
              </div>
              <p className="font-ribbon text-sm italic text-[#89907e]">
                {totalMemories} memories kept
              </p>
            </div>

            <dl className="grid grid-cols-2 border-y border-[#aeb8a5]/70 sm:grid-cols-3 lg:grid-cols-5">
              {metrics.map(({ key, label, color }) => (
                <div
                  key={key}
                  className="border-b border-r border-[#c6cdbd]/80 px-4 py-4 last:border-r-0 sm:border-b-0"
                >
                  <dt className="font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-[#788276]">
                    {label}
                  </dt>
                  <dd
                    className="mt-1 font-ribbon text-4xl font-bold leading-none"
                    style={{ color }}
                  >
                    {Number(stats[key]) || 0}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <h3 className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[#788276]">
                Experience types
              </h3>
              {stats.experience_type_agg?.length ? (
                stats.experience_type_agg.map(({ experience_type, count }) => (
                  <p
                    key={experience_type || "Uncategorized"}
                    className="font-ribbon text-base text-[#526451]"
                  >
                    <span className="mr-1 text-[#c98275]">✳</span>
                    {experience_type || "Uncategorized"}
                    <strong className="ml-2 font-sans text-sm font-bold text-[#303a32]">
                      {Number(count) || 0}
                    </strong>
                  </p>
                ))
              ) : (
                <p className="font-ribbon text-base italic text-[#89907e]">
                  No experiences recorded yet
                </p>
              )}
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-[#75856f]/45 pt-5">
            <p className="font-ribbon text-sm italic text-[#89907e]">
              Every pin has a story.
            </p>
            <Report />
          </footer>
        </div>
      </div>
    </main>
  );
};

export default Chronicle;
