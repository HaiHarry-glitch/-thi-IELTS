# Plan F — Listening full-test: audio chạy liên tục qua 4 section

## Vấn đề hiện tại

Khi user làm full-test listening và **chuyển section** (click tab Part 1/2/3/4 hoặc nút mũi tên):
- `AudioPlayer` remount vì có `key={\`${activePart}-${audioSrc}\`}` ở `ListeningClient.tsx` dòng 472.
- Mỗi section là 1 file audio riêng (`currentPart.audioUrl`).
- Section chưa từng play → hiện overlay "Click Play" → user phải bấm Play lại.
- Section đã play → autoStart=true nhưng audio remount nên seek về đầu, không phải nơi đang nghe.

→ Trải nghiệm sai. Theo IELTS thật: **chỉ bấm Play 1 lần ở section 1**, sau đó audio tự chạy lần lượt section 1 → 2 → 3 → 4 với gap 30s giữa các section. User có thể chuyển tab section bất kỳ lúc nào để **xem câu hỏi** nhưng audio không bị ảnh hưởng (vẫn chạy theo timeline thật).

## Yêu cầu logic mới

1. Khi vào full-test listening, user thấy overlay "Click Play" 1 lần.
2. Click Play → audio section 1 bắt đầu chạy.
3. Audio section 1 kết thúc → countdown 30s (UI hiện đếm ngược, audio im lặng).
4. Hết 30s → tự load + play audio section 2 (UI không cần bấm gì).
5. Lặp lại cho section 3, 4.
6. **Trong suốt quá trình**: user có thể click tab Part 1/2/3/4 hoặc dùng mũi tên để chuyển sang section khác xem câu hỏi → UI đổi part nhưng **audio không pause, không seek, không restart**.
7. UI có thể hiển thị 1 indicator "Audio đang ở Section X" để user biết audio thực sự đang chơi gì.
8. Auto-follow option: khi audio chuyển section → tự đổi `activePart` về section đang nghe (user vẫn override được bằng click tab).

## Approach

### Tách audio engine ra khỏi vòng đời `activePart`

Hiện tại AudioPlayer nằm trong body, remount theo `activePart`. Cần:

- Đưa **1 instance AudioPlayer duy nhất** lên cấp `ListeningClient`, **không** dùng `activePart` trong `key`.
- Quản lý state riêng cho audio: `audioPart` (0..3) — section audio đang chạy.
- `activePart` = section UI user đang xem (độc lập với `audioPart`).
- Khi `audioPart` chuyển → AudioPlayer nhận src mới (`quiz.parts[audioPart].audioUrl`) nhưng **không** remount key, chỉ swap `src` prop.

### State machine

```
phase: "idle" | "playing" | "gap" | "done"
audioPart: 0..3
gapRemaining: number | null
```

- `idle`: chưa Play → hiện overlay.
- `playing`: audio section `audioPart` đang chạy.
- `gap`: section `audioPart` đã end, đợi 30s rồi auto-advance.
- `done`: hết section 4, audio kết thúc.

Transitions:
- Click Play (idle) → playing, audioPart=0.
- AudioPlayer onAudioEnd (playing) → if audioPart<3 → gap; countdown 30s; → playing, audioPart++. Else → done.

### Files cần sửa

- `web/app/thi-thu/listening/[id]/ListeningClient.tsx`
  - Bỏ `key={\`${activePart}-${audioSrc}\`}` ở `<AudioPlayer>`.
  - Tách `audioPart` state riêng, `audioSrc = quiz.parts[audioPart]?.audioUrl`.
  - Bỏ `useEffect` reset `audioTimeRef = 0` mỗi khi đổi activePart (dòng 259–266).
  - Đổi `handleExamAudioEnd` từ thao tác `setActivePart` sang `setAudioPart`.
  - Khi đổi `audioPart` (auto-advance) → có thể optionally `setActivePart(audioPart)` để UI follow audio. Hoặc giữ activePart cũ (user choice).
  - Thêm UI badge: "Audio đang ở Section {audioPart+1}" trên header, có nút "Quay lại section đang nghe".

- `web/components/AudioPlayer.tsx`
  - Khi prop `src` đổi nhưng không remount, audio element auto reload — kiểm `<audio src={src}>` đã handle src change chưa. HTML5 `<audio>` load lại khi src đổi → cần `audioRef.current.load()` rồi `play()` nếu đang `playing`.
  - `listenFrom`/`listenTo` cũng đổi → useEffect [listenFrom, src] sẽ seek về listenFrom. Verify hoạt động khi `autoStart=true`.
  - Khi user manual chuyển section UI, audio không bị ảnh hưởng → AudioPlayer không nhận event gì → giữ nguyên state. ✓ OK vì props không đổi.

### Pseudo-code

```tsx
// ListeningClient.tsx
const [audioPart, setAudioPart] = useState(0);
const [audioPhase, setAudioPhase] = useState<"idle" | "playing" | "gap" | "done">("idle");
const [gapCountdown, setGapCountdown] = useState<number | null>(null);
const gapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

const audioSection = quiz.parts[audioPart];
const audioSrc = audioSection?.audioUrl ?? null;

function handleAudioStart() {
  setAudioPhase("playing");
  trackingRef.current?.push("audio_start", undefined, { part: audioPart + 1 });
}

function handleAudioEnd() {
  trackingRef.current?.push("audio_end", undefined, { audioTime: audioTimeRef.current, part: audioPart + 1 });
  if (audioPart >= quiz.parts.length - 1) {
    setAudioPhase("done");
    return;
  }
  // Start 30s gap
  setAudioPhase("gap");
  setGapCountdown(30);
  let remaining = 30;
  gapTimerRef.current = setInterval(() => {
    remaining -= 1;
    setGapCountdown(remaining);
    if (remaining <= 0) {
      clearInterval(gapTimerRef.current!);
      gapTimerRef.current = null;
      setGapCountdown(null);
      const next = audioPart + 1;
      setAudioPart(next);
      // Optional: follow audio in UI
      setActivePart(next);
      // AudioPlayer sẽ tự autoStart khi src đổi (xem dưới)
    }
  }, 1000);
}

// Render:
<AudioPlayer
  // KHÔNG còn key={...}
  src={audioSrc ?? ""}
  mode="exam"
  autoStart={audioPhase === "playing" || (audioPhase === "gap" /* no */) || (audioPart > 0 /* auto sau gap */)}
  listenFrom={audioSection?.listenFrom ?? null}
  listenTo={audioSection?.listenTo ?? null}
  onTimeUpdate={(t) => { audioTimeRef.current = t; }}
  onAudioStart={handleAudioStart}
  onAudioEnd={handleAudioEnd}
/>
```

Lưu ý quan trọng: `autoStart` đầu tiên phải `false` để overlay "Click Play" hiện ra. Sau khi user click → AudioPlayer.play() được gọi (đã có sẵn). Khi auto-advance section → cần `autoStart=true` để section sau tự chạy mà không cần click.

→ Cách an toàn: `autoStart = audioPart > 0` (section 1 yêu cầu click manual; section 2+ auto).

Hoặc dùng imperative handle: thêm method `play()` vào `AudioPlayerHandle`, gọi từ parent khi gap kết thúc:
```tsx
const audioRef = useRef<AudioPlayerHandle>(null);
// trong setTimeout cuối gap:
audioRef.current?.play();
```

### UI changes

1. **Header status bar** (luôn hiện khi đang full-test exam):
   - `audioPhase === "playing"`: "Đang phát Section {audioPart+1}"
   - `audioPhase === "gap"`: "Section {audioPart+1} đã kết thúc. Section {audioPart+2} sẽ tự bắt đầu sau {gapCountdown}s"
   - `audioPhase === "done"`: "Audio đã kết thúc"
2. **Nút "Theo dõi audio"** (chỉ hiện khi `activePart !== audioPart`):
   - Click → `setActivePart(audioPart)`.
3. **Tab footer**: hiện indicator (icon loa) ở tab nào audio đang chạy.

### Behavior khi user chuyển section thủ công

- Click tab Part X (X !== audioPart):
  - Chỉ `setActivePart(X)`.
  - Audio **không pause, không seek**.
  - UI hiển thị badge "Audio đang ở Section {audioPart+1}, click để quay lại".

### Edge cases

| Case | Hành vi mong muốn |
|---|---|
| User chuyển sang section đã qua (audioPart > X) | Câu hỏi vẫn editable (full-test cho phép đến hết giờ). Audio không restart. |
| User chuyển sang section tương lai (audioPart < X) | UI hiển thị nhưng audio chưa tới đó. OK. |
| User submit giữa chừng | Audio dừng (đã handle bằng `setSubmitted` + AudioPlayer pause). |
| Trang reload (refresh F5) | Audio mất state, user phải bấm Play lại từ section 1. Có thể chấp nhận; hoặc lưu `audioPart`+`currentTime` vào localStorage để resume. → **Skip resume**, scope khác. |
| User vào fullscreen | Audio không bị ảnh hưởng. |
| Audio file 1 section lỗi 404 | AudioPlayer onAudioEnd không bắn → gap không bắt đầu. Cần `onError` handler để skip section. |

## Thứ tự thực hiện

| # | Việc | Effort |
|---|---|---|
| 1 | Tách state `audioPart` khỏi `activePart` trong ListeningClient | 15 phút |
| 2 | Bỏ key remount AudioPlayer; chuyển sang src swap | 10 phút |
| 3 | Sửa AudioPlayer xử lý src change (load + autoStart sau gap) | 15 phút |
| 4 | Thêm phase state machine + 30s gap countdown UI | 20 phút |
| 5 | Header status bar + nút "Theo dõi audio" | 15 phút |
| 6 | Footer tab indicator loa cho section đang phát | 10 phút |
| 7 | Verify 4 scenario: play từ đầu, auto-advance, user chuyển tab giữa chừng, submit giữa chừng | 15 phút |
| 8 | Cập nhật `bugs-found.md` Round 5 | 5 phút |

## Verify checklist

- [ ] `/thi-thu/full/listening/C20T2` → bấm Play 1 lần → audio section 1 chạy đến hết.
- [ ] Section 1 kết thúc → countdown 30s hiển thị → audio section 2 tự chạy.
- [ ] Trong khi section 2 phát, click tab Part 1 → câu hỏi Part 1 hiện, audio **vẫn phát Part 2**.
- [ ] Header badge: "Audio đang ở Section 2".
- [ ] Click nút "Theo dõi audio" → quay lại Part 2.
- [ ] Hết section 4 → audio dừng, phase=done.
- [ ] Submit giữa chừng → audio pause, không leak interval.
- [ ] `npx tsc --noEmit` pass, `npm run build` pass.

## Quy ước commit

- `fix(listening): decouple audio playback from UI active part in full-test`
- `feat(listening): show audio section indicator and auto-follow button`
- `fix(audio): handle src change without remount for sequential sections`
- `chore(audit): document round 5 listening audio fixes`
