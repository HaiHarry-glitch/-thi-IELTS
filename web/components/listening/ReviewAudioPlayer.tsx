"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface ReviewAudioPlayerHandle {
  seek: (time: number) => void;
  getAudioEl: () => HTMLAudioElement | null;
}

function fmt(t: number): string {
  if (!Number.isFinite(t)) return "00:00";
  const m = Math.floor(t / 60).toString().padStart(2, "0");
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const ReviewAudioPlayer = forwardRef<ReviewAudioPlayerHandle, { src: string }>(function ReviewAudioPlayer({ src }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useImperativeHandle(ref, () => ({
    seek: (t: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(0, t);
      audioRef.current.play().catch(() => {});
    },
    getAudioEl: () => audioRef.current,
  }));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
    };
  }, []);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
  }

  function seek(t: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration || t, t));
  }

  function jump(delta: number) {
    if (!audioRef.current) return;
    seek(audioRef.current.currentTime + delta);
  }

  function setRateValue(nextRate: number) {
    setRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  }

  function setVolumeValue(v: number) {
    setVolume(v);
    if (!audioRef.current) return;
    audioRef.current.volume = v;
    audioRef.current.muted = v === 0;
    setMuted(v === 0);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  }

  const progress = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className="shrink-0 border-t-2 border-[#1a1a1a] bg-[#1a1a1a] px-5 py-3">
      <audio ref={audioRef} src={src} preload="auto" />

      <div className="flex items-center gap-3">
        {/* Time */}
        <span className="min-w-[88px] font-mono text-xs font-bold text-[#F5F1E9] opacity-70 shrink-0">
          {fmt(time)} / {fmt(duration)}
        </span>

        {/* Volume */}
        <button
          onClick={toggleMute}
          title={muted ? "Bật âm" : "Tắt âm"}
          className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-[#F5F1E9] border-opacity-30 text-[#F5F1E9] transition hover:border-opacity-100 hover:bg-[#F5F1E9] hover:text-[#1a1a1a]"
        >
          {muted ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 19L19 20.27 20.27 19 5.27 4 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
          )}
        </button>
        <input
          aria-label="Volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => setVolumeValue(parseFloat(e.target.value))}
          className="w-16 shrink-0 accent-[#FFD700]"
          style={{ height: "3px" }}
        />

        {/* Jump back */}
        <button
          onClick={() => jump(-5)}
          title="Lùi 5 giây"
          className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#F5F1E9] border-opacity-30 font-mono text-[11px] font-bold text-[#F5F1E9] transition hover:border-opacity-100 hover:bg-[#F5F1E9] hover:text-[#1a1a1a]"
        >
          ‹5
        </button>

        {/* Play / Pause */}
        <button
          onClick={toggle}
          title={playing ? "Dừng" : "Phát"}
          className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#F5F1E9] bg-[#F5F1E9] text-[#1a1a1a] shadow-[2px_2px_0_0_rgba(245,241,233,0.3)] transition hover:bg-[#FFD700] hover:border-[#FFD700]"
        >
          {playing ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Jump forward */}
        <button
          onClick={() => jump(5)}
          title="Tiến 5 giây"
          className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#F5F1E9] border-opacity-30 font-mono text-[11px] font-bold text-[#F5F1E9] transition hover:border-opacity-100 hover:bg-[#F5F1E9] hover:text-[#1a1a1a]"
        >
          5›
        </button>

        {/* Progress bar */}
        <div className="relative flex-1 group">
          <div className="h-1 w-full bg-[#F5F1E9] bg-opacity-20 cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(pct * duration);
          }}>
            <div
              className="h-full bg-[#FFD700] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            aria-label="Audio progress"
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || time)}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
        </div>

        {/* Speed */}
        <select
          value={rate}
          onChange={(e) => setRateValue(parseFloat(e.target.value))}
          aria-label="Tốc độ phát"
          className="shrink-0 border-2 border-[#F5F1E9] border-opacity-30 bg-transparent font-mono text-xs font-bold text-[#F5F1E9] px-2 py-1 focus:outline-none hover:border-opacity-100 cursor-pointer"
        >
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <option key={r} value={r} className="bg-[#1a1a1a] text-[#F5F1E9]">{r}x</option>
          ))}
        </select>
      </div>
    </div>
  );
});

export default ReviewAudioPlayer;
