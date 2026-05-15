"use client";

// Wraps content. On text selection, shows a small popover with two actions:
//   - Note    -> create a Note via NotesContext (selectedText becomes anchor)
//   - Highlight -> wrap selection in <mark> with yellow background
// Highlights are stored in the DOM only (session-local). Click highlight to remove.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNotes } from "./NotesContext";
import HighlightRestorer from "./HighlightRestorer";
import { useHighlightsStore } from "./HighlightsStore";

const HL_BG = "#fde68a"; // yellow

export default function HighlightLayer({
  partIdx,
  containerKey = "default",
  children,
}: {
  partIdx: number;
  containerKey?: string;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);
  // Use refs instead of state so these don't trigger re-renders that would reset dangerouslySetInnerHTML
  const savedRangeRef = useRef<Range | null>(null);
  const savedTextRef = useRef<string>("");
  const { addNote } = useNotes();
  const highlights = useHighlightsStore();
  const setWrapRef = useCallback((node: HTMLDivElement | null) => {
    wrapRef.current = node;
    setWrapEl(node);
  }, []);

  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setPopover(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const wrap = wrapRef.current;
      if (!wrap || !wrap.contains(range.commonAncestorContainer)) {
        setPopover(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) { setPopover(null); return; }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { setPopover(null); return; }

      savedRangeRef.current = range.cloneRange();
      savedTextRef.current = text;
      setPopover({
        x: rect.left + rect.width / 2,
        y: rect.top - 4,
      });
    }

    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-hl-popover]")) return;
      setPopover(null);
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  function offsetForRange(container: HTMLElement, range: Range) {
    const prefix = range.cloneRange();
    prefix.selectNodeContents(container);
    prefix.setEnd(range.startContainer, range.startOffset);
    const startOffset = prefix.toString().length;
    const text = range.toString();
    return { startOffset, endOffset: startOffset + text.length, text };
  }

  function unwrapMark(mark: HTMLElement, removeFromStore = true) {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    if (removeFromStore && mark.dataset.hlId) highlights?.remove(mark.dataset.hlId);
  }

  function attachRemoveHandler(mark: HTMLElement) {
    mark.addEventListener("click", (ev) => {
      ev.stopPropagation();
      unwrapMark(mark);
    });
  }

  function applyHighlight() {
    const range = savedRangeRef.current;
    if (!range) return;
    try {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const stored = highlights?.add({
        partIdx,
        containerKey,
        ...offsetForRange(wrap, range),
      });
      const span = document.createElement("mark");
      if (stored) span.dataset.hlId = stored.id;
      span.style.backgroundColor = HL_BG;
      span.style.padding = "0";
      span.className = "yp-hl";
      span.appendChild(range.extractContents());
      range.insertNode(span);
      attachRemoveHandler(span);
    } catch (e) {
      console.warn("Highlight failed:", e);
    }
    closePopover();
  }

  function applyNote() {
    const text = savedTextRef.current;
    if (!text) return;
    applyHighlight();
    addNote(partIdx, text);
  }

  function closePopover() {
    window.getSelection()?.removeAllRanges();
    savedRangeRef.current = null;
    savedTextRef.current = "";
    setPopover(null); // only one state change → minimal re-render
  }

  return (
    <div
      ref={setWrapRef}
      className="cursor-note"
    >
      <HighlightRestorer
        container={wrapEl}
        highlights={highlights?.getForContainer(partIdx, containerKey) ?? []}
        onRemove={(id) => highlights?.remove(id)}
      />
      {children}

      {popover && (
        <div
          data-hl-popover
          className="fixed z-50 -translate-x-1/2 -translate-y-full bg-white border border-gray-300 rounded shadow-md flex items-stretch"
          style={{ left: popover.x, top: popover.y }}
        >
          <button
            onMouseDown={(e) => { e.preventDefault(); applyNote(); }}
            className="flex flex-col items-center justify-center px-4 py-2 hover:bg-gray-100 border-r border-gray-200"
            title="Tạo note"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[10px] text-gray-500 mt-0.5">Note</span>
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); applyHighlight(); }}
            className="flex flex-col items-center justify-center px-4 py-2 hover:bg-gray-100"
            title="Highlight"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            <span className="text-[10px] text-gray-500 mt-0.5">Highlight</span>
          </button>
        </div>
      )}
    </div>
  );
}
