"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "yp_split_ratio";

export default function ResizableSplit({
  left,
  right,
  minRatio = 0.25,
  maxRatio = 0.75,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  minRatio?: number;
  maxRatio?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.5);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const r = parseFloat(saved);
      if (r >= minRatio && r <= maxRatio) setRatio(r);
    }
  }, [minRatio, maxRatio]);

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: MouseEvent) {
      const c = containerRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let r = x / rect.width;
      r = Math.max(minRatio, Math.min(maxRatio, r));
      setRatio(r);
    }

    function onUp() {
      setDragging(false);
      localStorage.setItem(STORAGE_KEY, String(ratio));
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, ratio, minRatio, maxRatio]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 overflow-hidden relative${dragging ? " select-none" : ""}`}
      style={{ cursor: dragging ? "col-resize" : undefined }}
    >
      {/* Left panel */}
      <div
        className="overflow-y-auto"
        style={{ width: `${ratio * 100}%`, pointerEvents: dragging ? "none" : "auto" }}
      >
        {left}
      </div>

      {/* Drag handle - 1px line + visible grip in the middle */}
      <div
        className="relative w-px bg-gray-200 group"
        onMouseDown={() => setDragging(true)}
        style={{ cursor: "col-resize" }}
      >
        {/* Wider hit area */}
        <div className="absolute top-0 -left-1.5 -right-1.5 h-full" />
        {/* Visible grip */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-5 h-5 bg-white border border-gray-300 rounded flex items-center justify-center text-gray-500 group-hover:bg-gray-100 group-hover:text-gray-700 shadow-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 3 12 9 6" />
            <polyline points="15 18 21 12 15 6" />
          </svg>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ pointerEvents: dragging ? "none" : "auto" }}
      >
        {right}
      </div>
    </div>
  );
}
