"use client";

import { Fragment, useEffect, useRef } from "react";
import VocabPopup from "@/components/listening/VocabPopup";

interface Segment {
  type: "vocab" | "text";
  value: string;
  id: number; // vocab parent_id (0 for plain text segments)
}

export interface SelectedVocab {
  word: string;
  parentId: number;
  key: string; // "{paraIndex}-{segIndex}"
}

interface Props {
  html: string;
  vocabMode?: boolean;
  selectedVocab?: SelectedVocab | null;
  onWordClick?: (word: string, parentId: number, key: string) => void;
  onCloseVocab?: () => void;
  focusedParagraphIndices?: number[];
}

// Extract content of each <p>…</p> tag
function parseParagraphs(html: string): string[] {
  const matches = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)];
  if (matches.length > 0) return matches.map((m) => m[1]);
  // Fallback: treat whole string as a single paragraph (no markup)
  return [html.replace(/<[^>]+>/g, "")];
}

// Parse {[text][id]} markup mixed with plain text
function parseSegments(content: string): Segment[] {
  const regex = /\{\[([^\]]*)\]\[(\d+)\]\}/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const raw = content.slice(lastIndex, match.index);
      if (raw.trim()) segments.push({ type: "text", value: raw, id: 0 });
    }
    segments.push({ type: "vocab", value: match[1], id: Number(match[2]) });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    const raw = content.slice(lastIndex);
    if (raw.trim()) segments.push({ type: "text", value: raw, id: 0 });
  }
  return segments;
}

function cleanWord(token: string): string {
  return token.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "").toLowerCase();
}

export default function ReadingPassageReview({
  html,
  vocabMode = false,
  selectedVocab = null,
  onWordClick,
  onCloseVocab,
  focusedParagraphIndices = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect if markup is present; if not, fall back to plain HTML render
  const hasMarkup = /\{\[[^\]]+\]\[\d+\]\}/.test(html);

  // Auto-scroll to first focused paragraph
  useEffect(() => {
    if (focusedParagraphIndices.length === 0) return;
    const target = containerRef.current?.querySelector("[data-focused-para='true']");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedParagraphIndices]);

  if (!hasMarkup) {
    // Fallback: no vocab markup, render raw HTML
    return (
      <div
        ref={containerRef}
        className="passage-html text-[14px] leading-[1.9] text-[#1a1a1a]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const paragraphs = parseParagraphs(html);

  // Which paragraph index holds the selected vocab popup?
  const selectedParaIndex =
    selectedVocab ? Number(selectedVocab.key.split("-")[0]) : -1;

  function renderToken(
    token: string,
    parentId: number,
    paraIndex: number,
    segIndex: number,
    tokenIndex: number
  ) {
    const cleaned = cleanWord(token);
    const key = `${paraIndex}-${segIndex}`;
    const isVocabSeg = selectedVocab !== null && selectedVocab.parentId === parentId;
    const isSelectedWord =
      isVocabSeg && cleaned !== "" && cleaned === selectedVocab?.word;

    return (
      <span
        key={`${key}-t${tokenIndex}`}
        onClick={() => {
          if (!vocabMode || !onWordClick || !cleaned) return;
          onWordClick(cleaned, parentId, key);
        }}
        className={[
          "transition-colors",
          vocabMode && cleaned
            ? "cursor-help rounded-sm hover:bg-[#FFD700]/50 hover:underline decoration-dotted"
            : "",
          isSelectedWord
            ? "rounded-sm bg-[#d9381e]/15 underline decoration-[#d9381e] decoration-2 underline-offset-2"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {token}
      </span>
    );
  }

  function renderSegment(
    seg: Segment,
    segIndex: number,
    paraIndex: number
  ) {
    if (seg.type === "text" || !vocabMode) {
      // Plain text — render as-is (no word-by-word splitting)
      return <span key={`seg-${segIndex}`}>{seg.value} </span>;
    }

    // Vocab segment in vocab mode: tokenise each word
    const tokens = seg.value.match(/\S+\s*/g) || [seg.value];
    return (
      <span key={`seg-${segIndex}`} data-vocab-seg={seg.id}>
        {tokens.map((token, ti) =>
          renderToken(token, seg.id, paraIndex, segIndex, ti)
        )}{" "}
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`space-y-3 text-[14px] leading-[1.9] text-[#1a1a1a] ${vocabMode ? "cursor-help" : ""}`}
    >
      {paragraphs.map((content, paraIndex) => {
        const isFocused = focusedParagraphIndices.includes(paraIndex);
        const segments = parseSegments(content);
        const showPopup = paraIndex === selectedParaIndex;

        return (
          <Fragment key={paraIndex}>
            <p
              data-para-index={paraIndex}
              data-focused-para={isFocused ? "true" : undefined}
              className={[
                "rounded px-2 py-1 transition-colors",
                isFocused
                  ? "bg-[#FFD700]/20 ring-2 ring-[#1a1a1a] ring-offset-1"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {segments.map((seg, si) => renderSegment(seg, si, paraIndex))}
            </p>
            {showPopup && selectedVocab && onCloseVocab && (
              <div className="my-1 block">
                <VocabPopup
                  word={selectedVocab.word}
                  sentenceId={selectedVocab.parentId}
                  onClose={onCloseVocab}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
