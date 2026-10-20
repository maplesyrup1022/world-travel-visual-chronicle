"use client";
import React, { Component } from "react";

class Report extends Component {
  state = {};
  render() {
    return (
      <button className="rounded-full border border-[#788675]/50 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#526451] transition hover:bg-[#788675]/10">
        Generate report
      </button>
      //connect to an agent to generate annual report
    );
  }
}

export default Report;
