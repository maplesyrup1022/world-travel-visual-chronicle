import React from "react";
import Report from "./Report";

const Chronicle = ({ chronicle, stats }) => {
  return (
    <div>
      {chronicle.map(
        ({
          id,
          title,
          description,
          start_date,
          end_date,
          tag,
          location_id,
          experiences,
        }) => (
          <div key={`life-period-${id}`}>
            <h3>{title}</h3>
            <span>
              {description},{start_date} {"->"} {end_date},{tag}
            </span>
            {experiences.map(
              ({
                id,
                title,
                description,
                experience_type,
                start_date,
                end_date,
                location_id,
                life_period_id,
                media_assets,
              }) => (
                <div key={`experience-${id}`} style={{ marginBottom: "10px" }}>
                  <h4>{title}</h4>
                  <span>
                    {description}, {experience_type}, {start_date}, {end_date}
                  </span>
                  {media_assets.map(
                    ({
                      id,
                      title,
                      description,
                      file_url,
                      captured_at,
                      experience_id,
                      location_id,
                    }) => (
                      <img
                        src={file_url}
                        alt={title}
                        key={`media-asset-${id}`}
                      />
                    ),
                  )}
                </div>
              ),
            )}
          </div>
        ),
      )}
      <span>life periods:{stats.life_periods}</span>
      <span>experiences:{stats.experiences}</span>
      <span>media assets:{stats.media_assets}</span>
      <span>cities visited:{stats.cities_visited}</span>
      <span>countries visited:{stats.countries_visited}</span>
      <span>{JSON.stringify(stats.experience_type_agg)}</span>
      <Report />
    </div>
  );
};

export default Chronicle;
