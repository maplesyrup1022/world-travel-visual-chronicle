"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const markdownComponents = {
  h1: ({ children }) => (
    <h3 className="mb-3 mt-6 font-alegreya text-2xl font-bold text-[#674b43] first:mt-0 sm:text-3xl">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-3 mt-6 border-b border-dashed border-[#d8c6a9] pb-2 font-alegreya text-xl font-bold text-[#805a60] first:mt-0 sm:text-2xl">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-2 mt-5 font-roboto-slab text-lg font-bold text-[#805a60] first:mt-0">
      {children}
    </h5>
  ),
  p: ({ children }) => (
    <p className="mb-4 whitespace-pre-line font-roboto-slab text-base leading-8 text-[#624e49] last:mb-0 sm:text-lg">
      {children}
    </p>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 ml-6 list-decimal space-y-3 font-roboto-slab leading-8 marker:font-bold marker:text-[#bd7188]">
      {children}
    </ol>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 ml-6 list-disc space-y-2 font-roboto-slab leading-8 marker:text-[#bd7188]">
      {children}
    </ul>
  ),
  li: ({ children }) => (
    <li className="pl-1 text-[#624e49] [&>p]:mb-1">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-[#8c5264]">{children}</strong>
  ),
  em: ({ children }) => <em className="text-[#986c72]">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-4 border-[#d78f9b]/70 bg-[#fff7f2] py-3 pl-4 pr-3 font-caveat text-xl text-[#805a60]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-dashed border-[#d8c6a9]" />,
  code: ({ children }) => (
    <code className="rounded bg-[#f3e9db] px-1.5 py-0.5 font-mono text-sm text-[#805a60]">
      {children}
    </code>
  ),
};

const Report = ({ querySuffix = "", periodLabel = "All dates" }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateReport = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${backendUrl}/chronicle/summary${querySuffix}`,
      );
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          detail || `Could not generate report (${response.status}).`,
        );
      }

      const result = await response.json();
      if (
        !Array.isArray(result) ||
        typeof result[0] !== "string" ||
        !Array.isArray(result[1]) ||
        typeof result[2] !== "object" ||
        result[2] === null
      ) {
        throw new Error("The report service returned an unexpected response.");
      }
      if (!result[0].trim()) {
        throw new Error("The report service returned an empty summary.");
      }

      setReport({
        summary: result[0],
        chapters: result[1],
        stats: result[2],
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate the report. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={generateReport}
          disabled={loading}
          className="rounded-full border-2 border-[#bd7188]/60 bg-[#fffefd] px-8 py-4 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[#845566] shadow-sm transition hover:bg-[#bd7188]/10 disabled:cursor-wait disabled:opacity-65"
        >
          {loading ? "Gathering your chronicle..." : "Generate report"}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="mx-auto mt-5 max-w-2xl rounded-xl border border-[#d58a9b]/50 bg-[#fff5f4] px-5 py-4 font-roboto-slab text-sm text-[#8e4659] shadow-sm"
        >
          <p className="font-bold">Your report could not be made just yet.</p>
          <p className="mt-1 break-words">{error}</p>
        </div>
      ) : null}

      {report ? (
        <article className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-[#dfcbb1] bg-[#fffaf0] p-5 shadow-[0_14px_35px_rgba(117,76,48,0.12)] sm:p-8">
          <span className="absolute -right-7 -top-8 h-24 w-24 rotate-12 rounded-lg border border-[#d9c9ad]/70 bg-[#f2dfb6]/70" />
          <div className="relative">
            <header className="border-b border-dashed border-[#cdb994] pb-5 text-center">
              <h2 className="mt-1 font-alegreya text-3xl font-bold text-[#674b43] sm:text-4xl">
                {periodLabel} yearly review
              </h2>
              <p className="mt-2 font-caveat text-xl text-[#a46f78]">
                Your story, in four keywords
              </p>
            </header>

            <section
              aria-label="Generated travel report"
              className="relative my-6 rounded-2xl border border-[#e5d6bd] bg-white/70 px-5 py-6 shadow-[inset_0_0_18px_rgba(190,157,113,0.08)] sm:px-7"
            >
              <span className="absolute -left-2 top-6 h-10 w-4 rounded-full bg-[#d78f9b]/80" />
              <div>
                <ReactMarkdown components={markdownComponents}>
                  {report.summary}
                </ReactMarkdown>
              </div>
            </section>
          </div>
        </article>
      ) : null}
    </section>
  );
};

export default Report;
