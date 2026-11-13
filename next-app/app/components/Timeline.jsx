"use client";

import Link from "next/link";
import React, { useState } from "react";
import { formatDateInput, parseDateInput } from "./dateInput";

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
  const [startDateText, setStartDateText] = useState(formatDateInput(MIN_DATE));
  const [endDateText, setEndDateText] = useState(formatDateInput(MAX_DATE));
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [dateRangeParams, setDateRangeParams] = useState(
    () =>
      new URLSearchParams({
        start_date: MIN_DATE,
        end_date: MAX_DATE,
      }),
  );

  const updateYear = (value) => {
    const year = Number(value);
    const nextStartDate = dateForYear(year);
    const nextEndDate = dateForYear(year, true);
    setSelectedYear(year);
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setStartDateText(formatDateInput(nextStartDate));
    setEndDateText(formatDateInput(nextEndDate));
    setDateRangeParams(new URLSearchParams({ year: String(year) }));
    onDateRangeChange?.({
      startDate: nextStartDate,
      endDate: nextEndDate,
      year,
    });
  };

  const updateStartDate = (text) => {
    setStartDateText(text);
    const value = parseDateInput(text);
    if (!value || value < MIN_DATE || value > endDate) return;
    setStartDate(value);
    setSelectedYear(Number(value.slice(0, 4)));
    setDateRangeParams(
      new URLSearchParams({ start_date: value, end_date: endDate }),
    );
    onDateRangeChange?.({ startDate: value, endDate });
  };

  const updateEndDate = (text) => {
    setEndDateText(text);
    const value = parseDateInput(text);
    if (!value || value < startDate || value > MAX_DATE) return;
    setEndDate(value);
    setSelectedYear(Number(value.slice(0, 4)));
    setDateRangeParams(
      new URLSearchParams({ start_date: startDate, end_date: value }),
    );
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
          <div className="flex items-center justify-between gap-3">
            <p className="font-caveat text-xl font-bold leading-none text-white">
              YEAR <span className="text-2xl">{selectedYear}</span>
            </p>
            <Link
              href={`/chronicle?${dateRangeParams.toString()}`}
              className="shrink-0 rounded-full border border-white/45 px-3 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-gray-100 transition hover:bg-white/15"
            >
              View chronicle
            </Link>
          </div>

          <div className="relative h-8 px-1">
            <div className="mt-1 absolute left-1 right-1 top-3 h-2 rounded-full bg-gray-100" />
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

          <div className="mb-1 flex justify-between font-caveat text-sm font-bold text-gray-300 -translate-y-1">
            <span>{MIN_YEAR}</span>
            <span className="text-white">{selectedYear}</span>
            <span>{CURRENT_YEAR}</span>
          </div>

          <div className="flex flex-wrap justify-between gap-2 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-300">
            <label className="flex items-center gap-2">
              From
              <input
                type="text"
                inputMode="numeric"
                placeholder="YYYY/MM/DD"
                value={startDateText}
                onChange={(event) => updateStartDate(event.target.value)}
                onBlur={() => setStartDateText(formatDateInput(startDate))}
                className="timeline-date-input rounded border border-white/30 bg-white/10 px-1.5 py-1 text-sm font-medium font-caveat normal-case tracking-normal text-gray-100"
              />
            </label>
            <label className="flex items-center gap-2">
              To
              <input
                type="text"
                inputMode="numeric"
                placeholder="YYYY/MM/DD"
                value={endDateText}
                onChange={(event) => updateEndDate(event.target.value)}
                onBlur={() => setEndDateText(formatDateInput(endDate))}
                className="timeline-date-input rounded border border-white/30 bg-white/10 px-1.5 py-1 text-sm font-medium font-caveat normal-case tracking-normal text-gray-100"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
}
