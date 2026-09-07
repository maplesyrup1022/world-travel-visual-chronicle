"use client";

import React, { Component } from "react";
import LocationSummary from "./LocationSummary";

class Map extends Component {
  state = {
    visitedLocations: this.props.visitedLocations,
    hoveredLocationId: null,
    hoveredLocationSummary: null,
  };

  handleMouseHover = async (id) => {
    console.log(`http://127.0.0.1:8000/locations/${id}/summary`);
    const res = await fetch(`http://127.0.0.1:8000/locations/${id}/summary`, {
      next: { revalidate: 20 },
    });
    const hoveredLocationSummary = await res.json();
    this.setState(
      //get related data from backend
      {
        hoveredLocationId: id,
        hoveredLocationSummary: hoveredLocationSummary,
      },
    );
  };

  //locationSummary = () => {};
  render() {
    return (
      <div>
        <ul>
          {this.state.visitedLocations.map(
            ({ id, name, city, country, latitude, longitude }) => (
              <li
                key={id}
                onMouseEnter={() => {
                  this.handleMouseHover(id);
                }}
                onMouseLeave={() => {
                  this.setState({
                    hoveredLocationId: null,
                    hoveredLocationSummary: null,
                  });
                }}
              >
                {city}, {country}
              </li>
            ),
          )}
        </ul>
        {this.state.hoveredLocationId && (
          <LocationSummary
            hoveredLocationSummary={this.state.hoveredLocationSummary}
          />
        )}
      </div>
    );
  }
}

export default Map;
