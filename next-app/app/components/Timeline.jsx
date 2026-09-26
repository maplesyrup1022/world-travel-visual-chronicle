"use client";

import Link from "next/link";
import React, { useState } from "react";

const MIN_YEAR = 2016;
const CURRENT_YEAR = new Date().getFullYear();
const today = new Date();
const MAX_DATE = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const MIN_DATE = `${MIN_YEAR}-01-01`;

const dateForYear = (year, endOfYear = false) => {
  if (endOfYear && year < CURRENT_YEAR) return `${year}-12-31`;
  if (endOfYear) return MAX_DATE;
  return `${year}-01-01`;
};

export default function Timeline({ onDateRangeChange }) {
  const [startDate, setStartDate] = useState(MIN_DATE);
  const [endDate, setEndDate] = useState(MAX_DATE);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const updateYear = (value) => {
    const year = Number(value);
    const nextStartDate = dateForYear(year);
    const nextEndDate = dateForYear(year, true);
    setSelectedYear(year);
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    onDateRangeChange?.({
      startDate: nextStartDate,
      endDate: nextEndDate,
      year,
    });
  };

  const updateStartDate = (value) => {
    if (!value || value < MIN_DATE || value > endDate) return;
    setStartDate(value);
    setSelectedYear(Number(value.slice(0, 4)));
    onDateRangeChange?.({ startDate: value, endDate });
  };

  const updateEndDate = (value) => {
    if (!value || value < startDate || value > MAX_DATE) return;
    setEndDate(value);
    setSelectedYear(Number(value.slice(0, 4)));
    onDateRangeChange?.({ startDate, endDate: value });
  };

  return (
    <div className="pointer-events-auto absolute bottom-6 right-5 z-40 w-120 max-w-[calc(100vw-2.5rem)]">
      {/* <div className="rounded-xl border border-white/35 bg-black/65 px-4 py-3 text-white shadow-[0_14px_30px_rgba(28,35,47,0.28)] backdrop-blur-md"> */}
      <div className="flex items-end">
        <div className="shrink-0 h-30 items-end justify-center">
          <img
            src="paint-girl.png"
            alt=""
            className="max-h-full object-contain translate-x-4"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-ribbon text-xl font-bold leading-none text-white">
              YEAR {selectedYear}
            </p>
            <Link
              href="/chronicle"
              className="shrink-0 rounded-full border border-white/45 px-3 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-gray-100 transition hover:bg-white/15"
            >
              View chronicle
            </Link>
          </div>

          <div className="relative h-8 px-1">
            <div className="absolute left-1 right-1 top-3 h-1.5 rounded-full bg-gray-100" />
            <input
              aria-label="Choose year"
              type="range"
              min={MIN_YEAR}
              max={CURRENT_YEAR}
              step="1"
              value={selectedYear}
              onChange={(event) => updateYear(event.target.value)}
              className="timeline-range absolute inset-0 w-full"
            />
          </div>

          <div className="mb-2 flex justify-between font-sans text-[10px] font-semibold text-gray-300">
            <span>{MIN_YEAR}</span>
            <span className="text-white">{selectedYear}</span>
            <span>{CURRENT_YEAR}</span>
          </div>

          <div className="flex flex-wrap justify-between gap-2 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-300">
            <label className="flex items-center gap-2">
              From
              <input
                type="date"
                min={MIN_DATE}
                max={endDate}
                value={startDate}
                onChange={(event) => updateStartDate(event.target.value)}
                className="timeline-date-input rounded border border-white/30 bg-white/10 px-1.5 py-1 text-[10px] font-medium normal-case tracking-normal text-gray-100"
              />
            </label>
            <label className="flex items-center gap-2">
              To
              <input
                type="date"
                min={startDate}
                max={MAX_DATE}
                value={endDate}
                onChange={(event) => updateEndDate(event.target.value)}
                className="timeline-date-input rounded border border-white/30 bg-white/10 px-1.5 py-1 text-[10px] font-medium normal-case tracking-normal text-gray-100"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}
