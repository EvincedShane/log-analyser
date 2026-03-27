"use client";

import { useState, useCallback, useRef } from "react";

type AnalysisState = "idle" | "analyzing" | "done" | "error";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [state, setState] = useState<AnalysisState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const acceptFile = (f: File) => {
    setFile(f);
    setAnalysis("");
    setState("idle");
    setErrorMsg("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) acceptFile(picked);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setState("analyzing");
    setAnalysis("");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setAnalysis((prev) => {
          const next = prev + chunk;
          // Scroll to bottom of analysis as it streams
          requestAnimationFrame(() => {
            analysisRef.current?.scrollTo({
              top: analysisRef.current.scrollHeight,
              behavior: "smooth",
            });
          });
          return next;
        });
      }

      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
      setState("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis("");
    setState("idle");
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ev-off-white)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-4 shadow-sm"
        style={{ background: "var(--ev-navy)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: "var(--ev-purple)", color: "var(--ev-white)" }}
          >
            LA
          </div>
          <span className="font-semibold text-lg" style={{ color: "var(--ev-white)" }}>
            Log Analyzer
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 py-10 gap-8 max-w-4xl mx-auto w-full">
        {/* Hero text */}
        <div className="text-center">
          <h1
            className="text-4xl font-bold tracking-tight mb-3"
            style={{ color: "var(--ev-navy)" }}
          >
            Analyze your log files instantly
          </h1>
          <p className="text-base" style={{ color: "var(--ev-gray-600)" }}>
            Drop any log file and get a structured AI analysis of errors, warnings, and recommendations.
          </p>
        </div>

        {/* Drop zone */}
        <div
          className={`
            w-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
            flex flex-col items-center justify-center gap-4 py-12 px-6 text-center
          `}
          style={{
            borderColor: isDragging ? "var(--ev-purple)" : "var(--ev-gray-400)",
            background: isDragging ? "var(--ev-purple-subtle)" : "var(--ev-white)",
            boxShadow: isDragging ? "0 0 0 4px rgba(85,52,218,0.12)" : "none",
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".log,.txt,.json,.csv,.out,.err,text/*"
            onChange={handleFileInput}
          />

          {!file ? (
            <>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--ev-purple-subtle)" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ev-purple)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-base" style={{ color: "var(--ev-navy)" }}>
                  Drop your log file here
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--ev-gray-600)" }}>
                  or{" "}
                  <span
                    className="font-medium underline cursor-pointer"
                    style={{ color: "var(--ev-purple)" }}
                  >
                    browse to upload
                  </span>
                  {" "}— .log, .txt, .json and more
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4 w-full max-w-md">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--ev-purple-subtle)" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ev-purple)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p
                  className="font-semibold text-sm truncate"
                  style={{ color: "var(--ev-navy)" }}
                >
                  {file.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ev-gray-600)" }}>
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="flex-shrink-0 p-1 rounded-md transition-colors"
                style={{ color: "var(--ev-gray-400)" }}
                title="Remove file"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Analyze button */}
        {file && state !== "analyzing" && (
          <button
            onClick={handleAnalyze}
            className="px-8 py-3 rounded-full font-semibold text-sm transition-all duration-150 shadow-md"
            style={{
              background: "var(--ev-purple)",
              color: "var(--ev-white)",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ev-purple-dark)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ev-purple)")}
          >
            Analyze Log File
          </button>
        )}

        {/* Analyzing indicator */}
        {state === "analyzing" && !analysis && (
          <div className="flex items-center gap-3" style={{ color: "var(--ev-gray-600)" }}>
            <svg
              className="animate-spin"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ev-purple)"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm">Analyzing with Claude...</span>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div
            className="w-full rounded-xl px-5 py-4 text-sm font-medium flex items-center gap-3"
            style={{
              background: "#FFF1F1",
              color: "var(--ev-error)",
              border: "1px solid #FED7D7",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMsg}
          </div>
        )}

        {/* Analysis output */}
        {(analysis || state === "analyzing") && (
          <div className="w-full rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--ev-gray-100)" }}>
            {/* Result header */}
            <div
              className="px-6 py-3 flex items-center justify-between"
              style={{ background: "var(--ev-navy)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: state === "analyzing" ? "var(--ev-teal)" : "var(--ev-teal)",
                    animation: state === "analyzing" ? "pulse 1.5s infinite" : "none",
                  }}
                />
                <span className="text-sm font-medium" style={{ color: "var(--ev-white)" }}>
                  {state === "analyzing" ? "Analyzing…" : "Analysis Complete"}
                </span>
              </div>
              {state === "done" && (
                <button
                  onClick={handleReset}
                  className="text-xs px-3 py-1 rounded-full transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "var(--ev-gray-400)",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ev-white)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ev-gray-400)")}
                >
                  Analyze another file
                </button>
              )}
            </div>

            {/* Result body */}
            <div
              ref={analysisRef}
              className="p-6 overflow-y-auto"
              style={{
                background: "var(--ev-white)",
                maxHeight: "60vh",
                fontFamily: "var(--font-geist-sans)",
              }}
            >
              <AnalysisRenderer text={analysis} />
              {state === "analyzing" && (
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
                  style={{ background: "var(--ev-purple)" }}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function AnalysisRenderer({ text }: { text: string }) {
  if (!text) return null;

  // Split into lines and render with basic markdown support
  const lines = text.split("\n");

  return (
    <div className="space-y-1 text-sm leading-relaxed" style={{ color: "var(--ev-navy)" }}>
      {lines.map((line, i) => {
        // H1 #
        if (line.startsWith("# ")) {
          return (
            <h1 key={i} className="text-xl font-bold mt-6 mb-2 first:mt-0" style={{ color: "var(--ev-navy)" }}>
              {renderInline(line.slice(2))}
            </h1>
          );
        }
        // H2 ##
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-base font-bold mt-5 mb-2 first:mt-0" style={{ color: "var(--ev-purple)" }}>
              {renderInline(line.slice(3))}
            </h2>
          );
        }
        // H3 ###
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="text-sm font-semibold mt-4 mb-1" style={{ color: "var(--ev-navy)" }}>
              {renderInline(line.slice(4))}
            </h3>
          );
        }
        // Code block delimiter — handled by block below, skip single lines
        if (line.startsWith("```")) return null;
        // Horizontal rule
        if (line === "---") {
          return <hr key={i} className="my-4" style={{ borderColor: "var(--ev-gray-100)" }} />;
        }
        // Bullet points
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span style={{ color: "var(--ev-purple)" }}>•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)/);
          if (match) {
            return (
              <div key={i} className="flex gap-2 ml-2">
                <span className="font-semibold min-w-[1.2rem]" style={{ color: "var(--ev-purple)" }}>{match[1]}.</span>
                <span>{renderInline(match[2])}</span>
              </div>
            );
          }
        }
        // Empty line
        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }
        // Normal paragraph
        return (
          <p key={i}>
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold**, `code`, and severity emoji patterns inline
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*([\s\S]*)/);
    // Inline code `text`
    const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`([\s\S]*)/);

    const boldIdx = boldMatch ? (boldMatch[1]?.length ?? 0) : Infinity;
    const codeIdx = codeMatch ? (codeMatch[1]?.length ?? 0) : Infinity;

    if (boldMatch && boldIdx <= codeIdx) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} style={{ color: "var(--ev-navy)", fontWeight: 600 }}>{boldMatch[2]}</strong>);
      remaining = boldMatch[3] ?? "";
    } else if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{
            background: "var(--ev-gray-100)",
            color: "var(--ev-purple)",
            border: "1px solid var(--ev-gray-100)",
          }}
        >
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3] ?? "";
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
