import React from "react";

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return "Date unknown";
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate;
};

const markerColors = [
  "bg-[#FFCAD4]",
  "bg-[#FFF275]",
  "bg-[#B2F7EF]",

  "bg-[#FBC490]",
  "bg-[#D8B4F8]",
];

const LocationSummary = ({ hoveredLocationSummary, onClose }) => {
  if (!hoveredLocationSummary) return null;

  const { location, life_periods = [] } = hoveredLocationSummary;

  return (
    <div className="pointer-events-auto absolute right-4 top-6 z-50">
      <img
        src="/tape.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-30px] z-20 h-fit -translate-x-1/2 object-contain opacity-90"
      />
      <div
        className="relative h-105 w-105 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-[#d99a9f] bg-[#fff8f5] text-[#211b1b] shadow-[8px_10px_0_rgba(105,40,48,0.16),0_20px_35px_rgba(52,36,17,0.2)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(202,91,106,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(202,91,106,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 28px, 28px 100%",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[rgba(255,250,248,0.34)]" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close location summary"
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#8d4650]/35 bg-[#fff8f5]/85 font-sans text-xl leading-none text-[#71353e] shadow-sm transition hover:bg-white"
        >
          ×
        </button>

        <div className="relative z-10 flex h-full flex-col px-7 py-6">
          <div className="border-b-2 border-dashed border-[#9e4d58]/55 pb-4 pr-10">
            <h2 className="mt-2 font-ribbon text-[2rem] font-bold leading-[0.82] tracking-tight text-[#301c20]">
              {location?.city || "Unknown city"},{" "}
              {location?.country || "Unknown country"}
            </h2>
          </div>

          <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-2">
            {life_periods.map(
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
                lifeIndex,
              ) => (
                <section
                  key={`life-period-${id}`}
                  className="relative border-l-2 border-[#70816c]/65 pl-4"
                >
                  <span className="absolute -left-1.75 top-1 h-3 w-3 rounded-full border-2 border-[#f8f7ed] bg-[#6e876d]" />
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`inline-block -rotate-1 px-2 py-1 font-ribbon text-[1.35rem] font-bold leading-none text-[#26382d] ${markerColors[lifeIndex % markerColors.length]}`}
                    >
                      {title || "Untitled life period"}
                    </h3>
                    {tag ? (
                      <span className="mt-1 shrink-0 border-b-2 border-[#6b806a]/50 px-1 font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-[#62735f]">
                        {tag}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 font-sans text-[9px] font-semibold uppercase tracking-[0.13em] text-[#62735f]">
                    {formatDateRange(start_date, end_date)}
                  </p>
                  <p className="mt-1 font-ribbon text-[1.02rem] leading-[1.2] text-[#3d4b40]">
                    {description || "No description available."}
                  </p>

                  {experiences.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {experiences.map(
                        ({
                          id: experienceId,
                          title: experienceTitle,
                          description: experienceDescription,
                          experience_type,
                          start_date: experienceStart,
                          end_date: experienceEnd,
                          media_assets = [],
                        }) => (
                          <article
                            key={`experience-${experienceId}`}
                            className="border-t border-[#789078]/40 pt-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-[#718170]">
                                  {formatDateRange(
                                    experienceStart,
                                    experienceEnd,
                                  )}
                                </p>
                                <h4 className="mt-1 font-ribbon text-[1.18rem] font-bold leading-none text-[#26382d]">
                                  {experienceTitle || "Untitled experience"}
                                </h4>
                              </div>
                              <span className="mt-1 shrink-0 font-sans text-[8px] font-bold uppercase tracking-[0.12em] text-[#718170]">
                                {experience_type || "Experience"}
                              </span>
                            </div>
                            {experienceDescription ? (
                              <p className="mt-1 font-ribbon text-[0.92rem] leading-tight text-[#526653]">
                                {experienceDescription}
                              </p>
                            ) : null}
                            {media_assets.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-3">
                                {media_assets.map(
                                  ({
                                    id: mediaId,
                                    title: mediaTitle,
                                    file_url,
                                  }) => (
                                    <figure
                                      key={`media-asset-${mediaId}`}
                                      className="w-26 -rotate-2 bg-white p-1.5 pb-5 shadow-[1px_3px_5px_rgba(42,55,42,0.2)] even:rotate-2"
                                    >
                                      <img
                                        src={file_url}
                                        alt={mediaTitle || "Travel memory"}
                                        className="aspect-square w-full object-cover"
                                      />
                                      {mediaTitle ? (
                                        <figcaption className="mt-1 truncate text-center font-ribbon text-[0.8rem] text-[#526653]">
                                          {mediaTitle}
                                        </figcaption>
                                      ) : null}
                                    </figure>
                                  ),
                                )}
                              </div>
                            ) : null}
                          </article>
                        ),
                      )}
                    </div>
                  ) : null}
                </section>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSummary;
