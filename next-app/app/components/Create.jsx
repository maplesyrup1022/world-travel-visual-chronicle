"use client";

import React, { useEffect, useRef, useState } from "react";

const actions = [
  { key: "life", label: "Life period", className: "bg-[#f49ab8]" },
  { key: "experience", label: "Experience", className: "bg-[#ef739d]" },
  { key: "media", label: "Upload media", className: "bg-[#d94c7d]" },
];

const fieldGroups = {
  life: {
    title: "New life period",
    fields: [
      "Title",
      "Description",
      "Start date",
      "End date",
      "Tag",
      "Location id",
    ],
  },
  experience: {
    title: "New experience",
    fields: [
      "Title",
      "Description",
      "Experience type",
      "Start date",
      "End date",
      "Location id",
    ],
  },
  media: {
    title: "Upload a memory",
    fields: [
      "Title",
      "Description",
      "File url",
      "Captured at",
      "Experience id",
      "Location id",
    ],
  },
};

export default function Create() {
  const [open, setOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const form = activeForm ? fieldGroups[activeForm] : null;

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto absolute bottom-5 left-110 z-50"
    >
      <div className="relative flex items-center gap-3">
        <div
          className={`flex items-center gap-2 transition-all duration-300 ${open ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0"}`}
        >
          {actions.map((action, index) => (
            <button
              key={action.key}
              type="button"
              aria-label={action.label}
              onClick={() => setActiveForm(action.key)}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/70 ${action.className} text-white shadow-lg transition duration-300 hover:-translate-y-2 hover:scale-110 ${open ? "" : "delay-0"}`}
              style={{ transitionDelay: open ? `${index * 70}ms` : "0ms" }}
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] opacity-0 transition group-hover:opacity-100">
                {action.key === "life"
                  ? "LP"
                  : action.key === "experience"
                    ? "EXP"
                    : "IMG"}
              </span>
              <span className="absolute -top-8 whitespace-nowrap rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label="Add to chronicle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-[#e94f86] text-4xl font-light text-white shadow-[0_10px_25px_rgba(94,22,52,0.35)] transition duration-300 hover:scale-110 hover:rotate-90 ${open ? "rotate-45" : ""}`}
        >
          +
        </button>
      </div>

      {form && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <form className="relative w-full max-w-xl rounded-[24px] border border-white/80 bg-[#fff8f1] p-6 text-stone-800 shadow-2xl sm:p-8">
            <button
              type="button"
              aria-label="Close form"
              onClick={() => setActiveForm(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xl text-stone-600 transition hover:bg-stone-200"
            >
              ×
            </button>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#d94c7d]">
              Add a new note
            </p>
            <h2 className="mt-1 font-ribbon text-4xl font-bold text-stone-900">
              {form.title}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {form.fields.map((field, index) => (
                <label
                  key={field}
                  className={index === 1 ? "sm:col-span-2" : ""}
                >
                  <span className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                    {field}
                  </span>
                  {field === "Description" ? (
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none ring-[#e94f86] focus:ring-2"
                      placeholder={`Add ${field.toLowerCase()}`}
                    />
                  ) : (
                    <input
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none ring-[#e94f86] focus:ring-2"
                      type={
                        field.toLowerCase().includes("date") ? "date" : "text"
                      }
                      placeholder={`Add ${field.toLowerCase()}`}
                    />
                  )}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="mt-6 w-full rounded-full bg-[#e94f86] px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#d43e74]"
            >
              Save note
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
