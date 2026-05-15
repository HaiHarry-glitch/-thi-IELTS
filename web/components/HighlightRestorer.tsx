"use client";

import { useEffect } from "react";
import type { HighlightRange } from "./HighlightsStore";

const HL_BG = "#fde68a";

function textNodes(container: HTMLElement): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent?.closest("mark.yp-hl") || parent?.closest("[data-hl-popover]")) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.textContent ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    out.push(node as Text);
    node = walker.nextNode();
  }
  return out;
}

function pointFromOffset(container: HTMLElement, offset: number): { node: Text; offset: number } | null {
  let seen = 0;
  for (const node of textNodes(container)) {
    const text = node.textContent ?? "";
    const next = seen + text.length;
    if (offset <= next) return { node, offset: Math.max(0, offset - seen) };
    seen = next;
  }
  return null;
}

export function applyStoredHighlight(
  container: HTMLElement,
  highlight: HighlightRange,
  onRemove: (id: string) => void,
) {
  if (container.querySelector(`mark.yp-hl[data-hl-id="${highlight.id}"]`)) return;

  const currentText = container.textContent?.slice(highlight.startOffset, highlight.endOffset) ?? "";
  if (currentText !== highlight.text) return;

  const start = pointFromOffset(container, highlight.startOffset);
  const end = pointFromOffset(container, highlight.endOffset);
  if (!start || !end) return;

  try {
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const mark = document.createElement("mark");
    mark.dataset.hlId = highlight.id;
    mark.style.backgroundColor = HL_BG;
    mark.style.padding = "0";
    mark.className = "yp-hl";
    mark.appendChild(range.extractContents());
    range.insertNode(mark);
    mark.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      onRemove(highlight.id);
    });
  } catch (error) {
    console.warn("Restore highlight failed:", error);
  }
}

export default function HighlightRestorer({
  container,
  highlights,
  onRemove,
}: {
  container: HTMLElement | null;
  highlights: HighlightRange[];
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    if (!container || !highlights.length) return;
    const timer = window.setTimeout(() => {
      for (const highlight of highlights) applyStoredHighlight(container, highlight, onRemove);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [container, highlights, onRemove]);

  return null;
}
