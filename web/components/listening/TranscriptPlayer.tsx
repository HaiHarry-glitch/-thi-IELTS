"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { TranscriptParagraph } from "@/lib/data";
import VocabPopup from "@/components/listening/VocabPopup";

interface FocusedLocation {
  from: number | null;
  to: number | null;
  paragraphs: number[];
}

interface Props {
  segments: TranscriptParagraph[];
  audioEl: HTMLAudioElement | null;
  onSeek: (seconds: number) => void;
  focusedLocation: FocusedLocation | null;
  focusByWord?: boolean;
  vocabMode?: boolean;
  selectedVocab?: { word: string; sentenceId: number; key: string } | null;
  onWordClick?: (word: string, sentenceId: number, key: string) => void;
  onCloseVocab?: () => void;
}

export default function TranscriptPlayer({
  segments,
  audioEl,
  onSeek,
  focusedLocation,
  focusByWord = false,
  vocabMode = false,
  selectedVocab = null,
  onWordClick,
  onCloseVocab,
}: Props) {
  const [activeIdx, setActiveIdx] = useState<{ p: number; s: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollPausedUntilRef = useRef(0);
  const autoScrollRef = useRef(false);

  useEffect(() => {
    if (!audioEl) return;
    const onTime = () => {
      const t = audioEl.currentTime;
      setCurrentTime(t);
      for (let pi = 0; pi < segments.length; pi++) {
        const para = segments[pi];
        for (let si = 0; si < para.sentences.length; si++) {
          const sentence = para.sentences[si];
          if (sentence.from != null && sentence.to != null && t >= sentence.from && t < sentence.to) {
            setActiveIdx({ p: pi, s: si });
            return;
          }
        }
      }
      setActiveIdx(null);
    };
    onTime();
    audioEl.addEventListener("timeupdate", onTime);
    audioEl.addEventListener("seeked", onTime);
    audioEl.addEventListener("play", onTime);
    const timer = window.setInterval(onTime, 160);
    return () => {
      audioEl.removeEventListener("timeupdate", onTime);
      audioEl.removeEventListener("seeked", onTime);
      audioEl.removeEventListener("play", onTime);
      window.clearInterval(timer);
    };
  }, [audioEl, segments]);

  useEffect(() => {
    if (!activeIdx) return;
    if (Date.now() < autoScrollPausedUntilRef.current) return;
    const el = containerRef.current?.querySelector(`[data-p="${activeIdx.p}"][data-s="${activeIdx.s}"]`);
    autoScrollRef.current = true;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => { autoScrollRef.current = false; }, 450);
  }, [activeIdx]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    let el: HTMLElement | null = root;
    while (el.parentElement) {
      const style = window.getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY)) break;
      el = el.parentElement;
    }
    if (!el) return;
    const pauseAutoScroll = () => {
      if (autoScrollRef.current) return;
      autoScrollPausedUntilRef.current = Date.now() + 6000;
    };
    root.addEventListener("wheel", pauseAutoScroll, { passive: true });
    root.addEventListener("touchmove", pauseAutoScroll, { passive: true });
    el.addEventListener("wheel", pauseAutoScroll, { passive: true });
    el.addEventListener("touchmove", pauseAutoScroll, { passive: true });
    el.addEventListener("scroll", pauseAutoScroll, { passive: true });
    return () => {
      root.removeEventListener("wheel", pauseAutoScroll);
      root.removeEventListener("touchmove", pauseAutoScroll);
      el.removeEventListener("wheel", pauseAutoScroll);
      el.removeEventListener("touchmove", pauseAutoScroll);
      el.removeEventListener("scroll", pauseAutoScroll);
    };
  }, []);

  useEffect(() => {
    if (!focusedLocation) return;
    const target =
      focusedLocation.from != null
        ? containerRef.current?.querySelector("[data-focused='true']")
        : containerRef.current?.querySelector(`[data-paragraph-focused='true']`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedLocation]);

  function sentenceIsFocused(pi: number, from: number | null, to: number | null) {
    if (!focusedLocation) return false;
    if (focusedLocation.from != null && focusedLocation.to != null && from != null && to != null) {
      return to > focusedLocation.from && from < focusedLocation.to;
    }
    return focusedLocation.paragraphs.includes(pi);
  }

  function cleanWord(token: string) {
    return token.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "").toLowerCase();
  }

  function renderSentenceContent({
    text,
    sentenceId,
    sentenceKey,
    from,
    to,
    isActive,
  }: {
    text: string;
    sentenceId: number;
    sentenceKey: string;
    from: number | null;
    to: number | null;
    isActive: boolean;
  }) {
    const shouldRenderTokens = vocabMode || (focusByWord && isActive && from != null && to != null && to > from);
    if (!shouldRenderTokens) return text;

    const tokens = text.match(/\S+\s*/g) || [text];
    const progress = from != null && to != null && to > from
      ? Math.max(0, Math.min(1, (currentTime - from) / (to - from)))
      : 0;
    const activeWordCount = Math.max(1, Math.ceil(progress * tokens.length));

    // Is this the sentence that has the selected vocab word?
    const isVocabSentence = selectedVocab !== null && sentenceId === selectedVocab.sentenceId;

    return tokens.map((token, index) => {
      const cleaned = cleanWord(token);
      const isAudioActive = focusByWord && isActive && index < activeWordCount;
      // Highlight if this is the exact selected vocab word in this sentence
      const isSelectedWord = isVocabSentence && cleaned !== "" && cleaned === selectedVocab?.word;

      return (
        <span
          key={`${index}-${token}`}
          data-word-active={isAudioActive ? "true" : undefined}
          onClick={(event) => {
            if (!vocabMode || !onWordClick) return;
            const word = cleanWord(token);
            if (!word) return;
            event.stopPropagation();
            onWordClick(word, sentenceId, sentenceKey);
          }}
          className={[
            "transition-colors",
            // Audio word highlight (gold)
            isAudioActive ? "rounded-sm" : "",
            // Vocab mode: hover highlight
            vocabMode && cleaned ? "cursor-help rounded-sm hover:bg-[#FFD700]/50 hover:underline decoration-dotted" : "",
            // Selected word: persistent red underline highlight
            isSelectedWord ? "rounded-sm bg-[#d9381e]/15 underline decoration-[#d9381e] decoration-2 underline-offset-2" : "",
          ].filter(Boolean).join(" ")}
          style={
            isAudioActive
              ? {
                  backgroundColor: "rgba(255, 215, 0, 0.45)",
                  boxDecorationBreak: "clone",
                  WebkitBoxDecorationBreak: "clone",
                }
              : undefined
          }
        >
          {token}
        </span>
      );
    });
  }

  return (
    <div ref={containerRef} className="space-y-3 text-[13px] leading-[1.85] text-[#1a1a1a]">
      {segments.map((para, pi) => {
        const paragraphFocused = focusedLocation?.paragraphs.includes(pi) ?? false;
        return (
          <div
            key={para.paragraph}
            data-paragraph-focused={paragraphFocused ? "true" : undefined}
            className="grid grid-cols-[80px_1fr] gap-3 px-1"
          >
            {/* Speaker label */}
            <div className="pt-0.5 text-right font-mono text-[10px] font-bold text-[#1a1a1a] opacity-40 shrink-0">
              {para.sentences[0]?.speaker ? `${para.sentences[0].speaker}:` : ""}
            </div>

            {/* Sentences */}
            <div>
              {para.sentences.map((sentence, si) => {
                const isActive = activeIdx?.p === pi && activeIdx?.s === si;
                const isFocused = sentenceIsFocused(pi, sentence.from, sentence.to);
                const useWordHighlight = focusByWord && isActive && sentence.from != null && sentence.to != null;
                const sentenceKey = `${pi}-${si}`;
                const showPopup = selectedVocab?.key === sentenceKey;

                return (
                  <Fragment key={sentenceKey}>
                    <span
                      data-p={pi}
                      data-s={si}
                      data-active={isActive ? "true" : undefined}
                      data-focused={isFocused ? "true" : undefined}
                      onClick={() => {
                        if (!vocabMode && sentence.from != null) onSeek(sentence.from);
                      }}
                      className={[
                        "rounded px-0.5 transition-colors",
                        !vocabMode && sentence.from != null ? "cursor-pointer hover:bg-[#FFD700]/20" : "",
                        vocabMode ? "cursor-help" : "",
                        // Active sentence (audio playing): gold tint
                        isActive && !useWordHighlight ? "bg-[#FFD700]/25" : "",
                        // Focused sentence (locate): light ink ring
                        !isActive && isFocused ? "bg-[#FFD700]/15 ring-1 ring-[#1a1a1a]/20" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      {renderSentenceContent({
                        text: sentence.text,
                        sentenceId: sentence.id,
                        sentenceKey,
                        from: sentence.from,
                        to: sentence.to,
                        isActive,
                      })}{" "}
                    </span>
                    {showPopup && selectedVocab && onCloseVocab && (
                      <div className="my-2 block">
                        <VocabPopup word={selectedVocab.word} sentenceId={selectedVocab.sentenceId} onClose={onCloseVocab} />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
