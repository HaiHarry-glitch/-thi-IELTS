"use client";

// Listening audio player.
//   - mode="exam"   -> renders as a TRANSPARENT OVERLAY across content area
//                      with centered headphones + Play button until started.
//                      After play, becomes a thin status bar at the top.
//                      Seek/pause disabled.
//   - mode="review" -> bottom bar with full controls (play/pause, seek, speed).
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";

interface Props {
  src: string;
  mode: "exam" | "review";
  autoStart?: boolean;
  listenFrom?: number | null;
  listenTo?: number | null;
  onTimeUpdate?: (currentTime: number) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}

export interface AudioPlayerHandle {
  isStarted: () => boolean;
  play: () => void;
  pause: () => void;
}

function fmt(t: number): string {
  if (!isFinite(t)) return "00:00";
  const m = Math.floor(t / 60).toString().padStart(2, "0");
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(function AudioPlayer({ src, mode, autoStart = false, listenFrom = null, listenTo = null, onTimeUpdate, onAudioStart, onAudioEnd }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const startedRef = useRef(false);
  const endNotifiedRef = useRef(false);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onAudioStartRef = useRef(onAudioStart);
  const onAudioEndRef = useRef(onAudioEnd);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  useImperativeHandle(ref, () => ({
    isStarted: () => started,
    play,
    pause,
  }), [started]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onAudioStartRef.current = onAudioStart;
    onAudioEndRef.current = onAudioEnd;
  }, [onAudioEnd, onAudioStart, onTimeUpdate]);

  useEffect(() => {
    const a = audioRef.current;
    endNotifiedRef.current = false;
    setDuration(0);
    setTime(listenFrom ?? 0);
    if (!a) return;

    a.load();

    const applyStart = () => {
      const startAt = listenFrom ?? 0;
      a.currentTime = startAt;
      setTime(startAt);
      onTimeUpdateRef.current?.(startAt);
    };

    if (a.readyState >= 1) applyStart();
    else a.addEventListener("loadedmetadata", applyStart, { once: true });

    return () => a.removeEventListener("loadedmetadata", applyStart);
  }, [listenFrom, src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (listenTo != null && a.currentTime >= listenTo) {
        a.currentTime = listenTo;
        setTime(listenTo);
        onTimeUpdateRef.current?.(listenTo);
        a.pause();
        if (!endNotifiedRef.current) {
          endNotifiedRef.current = true;
          onAudioEndRef.current?.();
        }
        return;
      }
      setTime(a.currentTime);
      onTimeUpdateRef.current?.(a.currentTime);
    };
    const onDur = () => setDuration(a.duration);
    const onPlay = () => {
      setPlaying(true);
      if (!startedRef.current) {
        startedRef.current = true;
        setStarted(true);
      }
      onAudioStartRef.current?.();
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      if (!endNotifiedRef.current) {
        endNotifiedRef.current = true;
        onAudioEndRef.current?.();
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [listenTo]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !autoStart) return;
    const timer = window.setTimeout(() => {
      if (listenFrom != null && a.currentTime < listenFrom) a.currentTime = listenFrom;
      a.play().catch(() => {
        startedRef.current = false;
        setStarted(false);
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [autoStart, listenFrom, src]);

  function play() {
    const a = audioRef.current;
    if (!a) return;
    if (listenFrom != null && (a.currentTime < listenFrom || (listenTo != null && a.currentTime >= listenTo))) {
      endNotifiedRef.current = false;
      a.currentTime = listenFrom;
    }
    a.play();
    startedRef.current = true;
    setStarted(true);
  }

  function pause() {
    audioRef.current?.pause();
  }

  function toggle() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  function seek(t: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = t;
  }

  function changeRate(r: number) {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }

  if (mode === "exam") {
    return (
      <>
        <audio ref={audioRef} src={src} preload="auto" />
        {!started && (
          <div className="absolute inset-0 z-30 bg-black/50 flex flex-col items-center justify-center pointer-events-auto">
            <svg className="w-20 h-20 mb-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1c-4.97 0-9 4.03-9 9v7a3 3 0 003 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3a3 3 0 003-3v-7c0-4.97-4.03-9-9-9z" />
            </svg>
            <p className="text-center max-w-3xl text-sm leading-relaxed mb-2 text-white px-6">
              You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions.
            </p>
            <p className="text-sm mb-3 text-white">To continue, click Play</p>
            <button
              onClick={play}
              className="inline-flex items-center gap-2 bg-black text-white font-semibold rounded-md px-6 py-2 hover:bg-gray-800"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </button>
          </div>
        )}
        {/* After Play: audio plays in background, no visible bar (matches original) */}
      </>
    );
  }

  // REVIEW mode
  return (
    <div className="bg-black text-white px-4 py-3 flex items-center gap-3">
      <audio ref={audioRef} src={src} preload="auto" />
      <button onClick={toggle} className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200">
        {playing ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <span className="font-mono text-sm">{fmt(time)} / {fmt(duration)}</span>
      <input type="range" min={0} max={duration || 0} step={0.1} value={time}
        onChange={(e) => seek(parseFloat(e.target.value))} className="flex-1 accent-white" />
      <div className="flex items-center gap-1 text-xs">
        <span>Tốc độ:</span>
        {[0.75, 1, 1.25, 1.5, 2].map((r) => (
          <button key={r} onClick={() => changeRate(r)}
            className={`px-2 py-0.5 rounded ${rate === r ? "bg-white text-black" : "hover:bg-white/20"}`}>{r}x</button>
        ))}
      </div>
    </div>
  );
});

export default AudioPlayer;
