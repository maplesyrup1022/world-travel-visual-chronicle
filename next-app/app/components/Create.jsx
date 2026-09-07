"use client";
import React, { Component, useRef } from "react";

class Create extends Component {
  state = {
    showButtons: false,
    createLifePeriod: false,
    createExperience: false,
    uploadMedia: false,
  };
  // Must use arrow function when defining methods that need to read the state, cuz
  // arrow function don't have this, so will capture this from the surrounding scope
  // which is the class instance, but regular function methods do have their own this,
  // and it’s not automatically bound to the class instance.
  timeout = null;
  handleShowButtons = () => {
    // Cancel any pending collapse
    clearTimeout(this.timeout);
    this.setState({ showButtons: true });
  };
  handleHideButtons = () => {
    this.timeout = setTimeout(() => {
      this.setState({ showButtons: false });
    }, 1000); // Delay before collapsing
  };
  createLifePeriod = () => {
    return (
      <div style={{ padding: 20, position: "fixed", top: "20px" }}>
        <button
          onClick={() => {
            this.setState({ createLifePeriod: false });
          }}
        >
          X
        </button>
        title:<input placeholder="title"></input>
        description:<input placeholder="optional description"></input>
        start_date:<input placeholder="start_date"></input>
        end_date:<input placeholder="end_date"></input>
        tag:<input placeholder="optional tag"></input>
        location_id: <input placeholder="location_id"></input>
      </div>
    );
  };
  createExperience = () => {
    return (
      <div style={{ padding: 20, position: "fixed", top: "20px" }}>
        <button
          onClick={() => {
            this.setState({ createExperience: false });
          }}
        >
          X
        </button>
        title:<input placeholder="title"></input>
        description:<input placeholder="optional description"></input>
        experience_type:<input placeholder="optional experience_type"></input>
        start_date:
        <input placeholder="start_date"></input>
        end_date:<input placeholder="end_date"></input>
        location_id: <input placeholder="location_id"></input>
      </div>
    );
  };
  uploadMedia = () => {
    return (
      <div style={{ padding: 20, position: "fixed", top: "20px" }}>
        <button
          onClick={() => {
            this.setState({ uploadMedia: false });
          }}
        >
          X
        </button>
        title:<input placeholder="optional title"></input>
        description:<input placeholder="optional description"></input>
        file_url:<input placeholder="file_url"></input>
        captured_at:<input placeholder="optional captured_at"></input>
        experience_id: <input placeholder="optional experience_id"></input>
        location_id: <input placeholder="optional location_id"></input>
      </div>
    );
  };
  render() {
    return (
      // if you need the callback function to take in input values, use another arrow
      // function to warp around it, callback means this func will get executed when
      // clicked on, so you can only pass in a function instead of the output of a func
      <div>
        <button
          onMouseEnter={this.handleShowButtons}
          onMouseLeave={this.handleHideButtons}
        >
          +
        </button>
        {this.state.showButtons && (
          <button
            onMouseEnter={this.handleShowButtons}
            onMouseLeave={this.handleHideButtons}
            onClick={() => this.setState({ createLifePeriod: true })}
          >
            Create Life Period
          </button>
        )}
        {this.state.createLifePeriod && this.createLifePeriod()}
        {this.state.showButtons && (
          <button
            onMouseEnter={this.handleShowButtons}
            onMouseLeave={this.handleHideButtons}
            onClick={() => this.setState({ createExperience: true })}
          >
            Create Experience
          </button>
        )}
        {this.state.createExperience && this.createExperience()}
        {this.state.showButtons && (
          <button
            onMouseEnter={this.handleShowButtons}
            onMouseLeave={this.handleHideButtons}
            onClick={() => this.setState({ uploadMedia: true })}
          >
            Upload Media
          </button>
        )}
        {this.state.uploadMedia && this.uploadMedia()}
      </div>
    );
    // when hover over become 3 buttons create new life period,
    // create experience, upload media asset
  }
}

export default Create;
