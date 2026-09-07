import React from "react";

const LocationSummary = ({ hoveredLocationSummary }) => {
  return (
    hoveredLocationSummary && (
      <div>
        <span>
          {hoveredLocationSummary.location.city},
          {hoveredLocationSummary.location.country}
        </span>
        {hoveredLocationSummary.life_periods.map(
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
                  <div key={`experience-${id}`}>
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
      </div>
    )
  );
};

export default LocationSummary;
