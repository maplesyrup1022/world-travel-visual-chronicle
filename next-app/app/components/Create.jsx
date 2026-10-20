"use client";

import React, { useEffect, useRef, useState } from "react";

const actions = [
  { key: "life-period", label: "Life Period", className: "bg-[#f49ab8]" },
  { key: "experience", label: "Experience", className: "bg-[#ef739d]" },
  { key: "media", label: "Media", className: "bg-[#d94c7d]" },
];

const fieldGroups = {
  "life-period": {
    title: "New life period*",
    fields: ["Description", "Start date*", "End date*", "Tag", "Location id*"],
  },
  experience: {
    title: "New experience*",
    fields: [
      "life period id*",
      "Description",
      "Experience type",
      "Start date*",
      "End date*",
      "Location id",
    ],
  },
  media: {
    title: "Upload media",
    fields: [
      "Description",
      "File url",
      "Captured at",
      "Experience id",
      "Location id",
    ],
  },
};

const formAccents = {
  "life-period": {
    marker: "bg-[#f4b4c6]",
    focus: "focus:ring-[#e94f86]",
    button: "bg-[#e94f86] hover:bg-[#d43e74]",
  },
  experience: {
    marker: "bg-[#f2c894]",
    focus: "focus:ring-[#d58c45]",
    button: "bg-[#d58c45] hover:bg-[#bd7634]",
  },
  media: {
    marker: "bg-[#b9d5c1]",
    focus: "focus:ring-[#668b70]",
    button: "bg-[#668b70] hover:bg-[#52745c]",
  },
};

export default function Create() {
  const [open, setOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [titleText, setTitleText] = useState("");
  const [formPosition, setFormPosition] = useState({ x: 0, y: 0 });
  const [saveNotice, setSaveNotice] = useState(null);
  const rootRef = useRef(null);
  const dragStartRef = useRef(null);
  const noticeTimerRef = useRef(null);

  const showSaveNotice = (notice) => {
    window.clearTimeout(noticeTimerRef.current);
    setSaveNotice(notice);
    if (notice.type === "success") {
      noticeTimerRef.current = window.setTimeout(() => {
        setSaveNotice(null);
      }, 2000);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault(); // stop page reload
    const req = Object.fromEntries(new FormData(e.target).entries()); // get all fields

    let url = "";
    if (activeForm === "life-period") {
      url = "http://127.0.0.1:8000/life-periods";
    } else if (activeForm === "experience") {
      url = `http://127.0.0.1:8000/life-periods/${req["life period id*"]}/experiences`;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const responseText = await res.text();
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { detail: responseText };
      }

      if (!res.ok) {
        const detail = result.detail ?? result.message;
        const message = Array.isArray(detail)
          ? detail
              .map((item) => {
                if (typeof item === "string") return item;
                const field = Array.isArray(item.loc)
                  ? item.loc.slice(1).join(" → ")
                  : "";
                return [field, item.msg || JSON.stringify(item)]
                  .filter(Boolean)
                  .join(": ");
              })
              .join("\n")
          : typeof detail === "string"
            ? detail
            : detail
              ? JSON.stringify(detail)
              : res.statusText || "The request could not be completed.";

        showSaveNotice({
          type: "error",
          status: `HTTP ${res.status}`,
          message,
        });
        return;
      }

      showSaveNotice({
        type: "success",
        message: result.message || "Your note was saved successfully.",
      });
    } catch (error) {
      showSaveNotice({
        type: "error",
        status: "Connection error",
        message: error.message || "Could not connect to the server.",
      });
    }
  }

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const form = activeForm ? fieldGroups[activeForm] : null;
  const accent = activeForm ? formAccents[activeForm] : formAccents.life;

  const selectForm = (formKey) => {
    setActiveForm(formKey);
    setTitleText(fieldGroups[formKey].title);
    setFormPosition({ x: 0, y: 0 });
  };

  const handleFormPointerDown = (event) => {
    if (
      event.button !== 0 ||
      event.target.closest("input, textarea, button, [contenteditable='true']")
    ) {
      return;
    }

    dragStartRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX: formPosition.x,
      positionY: formPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleFormPointerMove = (event) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;

    setFormPosition({
      x: dragStart.positionX + event.clientX - dragStart.pointerX,
      y: dragStart.positionY + event.clientY - dragStart.pointerY,
    });
  };

  const finishFormDrag = (event) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
    }
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute top-0 left-0 z-80 w-full h-full font-roboto-slab"
    >
      <div className="pointer-events-auto absolute bottom-5 left-110">
        <div className="relative flex items-center gap-3">
          <div
            className={`flex items-center gap-2 transition-all duration-300 ${open ? "translate-x-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
          >
            {actions.map((action, index) => (
              <button
                key={action.key}
                type="button"
                aria-label={action.label}
                onClick={() => selectForm(action.key)}
                className={`group relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/70 ${action.className} text-white shadow-lg transition duration-300 hover:-translate-y-2 hover:scale-110 ${open ? "" : "delay-0"}`}
                style={{
                  left: ["135px", "135px", "135px"][index],
                  top: ["-35px", "-74px", "-35px"][index],
                  transitionDelay: open ? `${index * 70}ms` : "0ms",
                }}
              >
                <span
                  className={`${action.key === "experience" ? "text-[8px]" : "text-[10px]"} tracking-[0.12em] font-bold`}
                >
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
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-[#e94f86] text-5xl text-white shadow-[0_10px_25px_rgba(94,22,52,0.35)] transition duration-300 hover:scale-110 hover:rotate-90 ${open ? "rotate-45" : ""}`}
          >
            <span className="relative top-[-2px]">+</span>
          </button>
        </div>
      </div>
      {saveNotice ? (
        <div
          role={saveNotice.type === "error" ? "alert" : "status"}
          className={`pointer-events-auto absolute right-5 top-5 z-100 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border px-4 py-3 shadow-[0_14px_35px_rgba(51,39,34,0.22)] backdrop-blur-md ${
            saveNotice.type === "success"
              ? "border-[#98b49b] bg-[#f1f8ef]/95 text-[#36543a]"
              : "border-[#d99a9f] bg-[#fff3f1]/95 text-[#66373b]"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-sans text-sm font-bold text-white ${
                saveNotice.type === "success" ? "bg-[#668b70]" : "bg-[#bf6970]"
              }`}
            >
              {saveNotice.type === "success" ? "✓" : "!"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-xs font-bold uppercase tracking-[0.14em]">
                {saveNotice.type === "success"
                  ? "Saved successfully"
                  : saveNotice.status}
              </p>
              <p className="mt-1 whitespace-pre-line wrap-break-word font-ribbon text-base leading-snug">
                {saveNotice.message}
              </p>
            </div>
            {saveNotice.type === "error" ? (
              <button
                type="button"
                aria-label="Close save error notice"
                onClick={() => {
                  window.clearTimeout(noticeTimerRef.current);
                  setSaveNotice(null);
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none opacity-70 transition hover:bg-black/5 hover:opacity-100"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {form && (
        <div
          className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-150 flex items-center justify-center p-4 z-10"
          style={{
            transform: `translate(${formPosition.x}px, ${formPosition.y}px)`,
          }}
        >
          <form
            onPointerDown={handleFormPointerDown}
            onPointerMove={handleFormPointerMove}
            onPointerUp={finishFormDrag}
            onPointerCancel={finishFormDrag}
            onSubmit={handleSubmit}
            className="relative w-full max-w-xl rounded-[24px] border border-white/80 bg-[#fff8f1] p-6 text-stone-800 shadow-2xl sm:p-6"
          >
            <button
              type="button"
              aria-label="Close form"
              onClick={() => setActiveForm(null)}
              className="absolute z-10 right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xl text-stone-600 transition hover:bg-stone-200"
            >
              ×
            </button>
            <div className="relative mb-1 w-full">
              <span
                aria-hidden="true"
                className={`absolute bottom-1 left-0 h-3 w-full -rotate-1 ${accent.marker}`}
              />
              <input
                aria-label={`${form.title} title`}
                value={titleText}
                onChange={(event) => setTitleText(event.target.value)}
                name="title"
                className={`relative w-full border-0 bg-transparent p-0 text-4xl font-bold outline-none focus:ring-0 ${accent.focus}`}
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {form.fields.map((field) => (
                <label
                  key={field}
                  className={field === "Description" ? "sm:col-span-2" : ""}
                >
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                    {field}
                  </span>
                  {field === "Description" ? (
                    <textarea
                      name="description"
                      className={`min-h-24 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:ring-2 ${accent.focus}`}
                      placeholder={`Add ${field.toLowerCase()}`}
                    />
                  ) : (
                    <input
                      name={`${field.toLowerCase().replace(/ /g, "_")}`}
                      className={`w-full rounded-xl border border-stone-200 bg-white px-3 py-2 outline-none focus:ring-2 ${accent.focus}`}
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
              type="submit"
              className={`mt-6 w-full rounded-full px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-white transition ${accent.button}`}
            >
              Save note
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
