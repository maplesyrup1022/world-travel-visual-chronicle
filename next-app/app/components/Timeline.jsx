"use client";
import React, { Component } from "react";

class Timeline extends Component {
  state = {};
  render() {
    return (
      //a static timeline with some time scale and a person walking on the scale
      // allows user to change the range or select a specific year
      <div>
        start_date:<input placeholder="start_date"></input>
        end_date:<input placeholder="end_date"></input>
      </div>
    );
  }
}

export default Timeline;
