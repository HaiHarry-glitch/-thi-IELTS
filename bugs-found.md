# UI Audit Notes

## Fixed

- `/thi-thu/reading/10420` crashed with `matchingHeadingParagraph.trim is not a function` because some normalized values are numeric. Fixed by coercing the value to string before parsing.
- Single-quiz exam routes no longer show misleading `Part 1` for standalone passages/sections whose question range is not 1-based. They now show the passage/section title while full-test routes still show `Part N`.
- Full-test modal question count now uses expanded slots, so MC_MANY tests such as `/thi-thu/full/reading/C20T2` display `40 câu` instead of raw question count.

## Data Gaps

- `/thi-thu/reading/6351` returns 404 because `data/normalized/6351.json` is missing. This is a scrape/data gap, not a UI bug.

## Verified

- `data/full-tests/_index.json` integrity check: no full-test has total slot count different from 40.
- Portal `3000` smoke: `/thi-thu/reading/10420`, `/thi-thu/full/reading/C20T2`, `/thi-thu/full/listening/C20T2` return 200 after fixes.

## Round 3 Fixed

- Removed the unused `findQuestionForParagraph` helper and corrected `matchingHeadingParagraph` types to accept numeric source data.
- Practice Reading now counts expanded MC_MANY slots in total, part progress, and question navigation.
- Matching Headings now has a tap-to-select fallback for touch/mobile while keeping desktop drag-drop.
- Listening exam audio now honors `listenFrom`/`listenTo`, so full-test sections start and stop at the right timestamps before the 30-second auto-advance.
- Saved answers are migrated from old slot-keyed localStorage shapes such as `23-0`/`23-1` into question-keyed arrays.
- Multiple choice many now allows the larger of `correctAnswers.length` and `maxSelections`, covering data where instructions say choose THREE/FOUR but normalized `maxSelections` was lower or zero.
- `cleanTitle` now removes duplicated full-test skill suffixes like `(Reading) - Reading`.

## Round 4 Fixed

- Reading and Listening review clients now read full-test answers from `hin_answers_full_{skill}_{fullTestKey}` instead of falling back to single-quiz `yp_answers_{id}`.
- Review scoring now uses the shared slot-based `computeReviewStats` helper, so MC_MANY awards one point per correct selected answer instead of marking the whole raw question correct after one matching option.
- MC_MANY inline review and bottom navigation now render per expanded slot, matching ResultClient and exam footer behavior.
- ResultClient now uses the same shared review scoring helper as the review clients to keep scoring consistent.

## Round 5 Fixed

- Full-test Listening audio playback is now decoupled from the visible UI part: switching tabs or arrowing between sections no longer remounts, pauses, seeks, or restarts the audio.
- Listening full-test now has an audio state machine (`idle`, `playing`, `gap`, `done`) with a 30-second countdown between sections and automatic playback of the next section.
- The exam UI shows which section the audio is currently playing, offers a `Theo doi audio` button when the learner is viewing another section, and marks the audio section in the footer.
- `AudioPlayer` now handles `src` changes without active-part remounting and exposes imperative `play`/`pause` controls for submit/cancel cleanup.
- Full-test Listening only applies `listenFrom`/`listenTo` when parts share one audio file; separate section mp3 files play from the beginning to their natural end.

## Round 6 Fixed

- `NOTE_COMPLETION` sets with `SUMMARY_COMPLETION` / `SENTENCE_COMPLETION` questions and a letter bank now render with inline dropdown gaps plus option chips instead of a very wide table.
- Summary-with-bank review mode now keeps the same answer shape (`answers[qId] = "A"`) and shows normal answer status / explanations.
- Highlight selections are now stored by part/container/text offsets and restored when switching Reading/Listening parts.
- Highlight marks can be clicked to remove them, and the in-memory store/localStorage cache is updated at the same time.
- Netlify deployment config is prepared at the repo root and inside `web/`, with Node 20, Next plugin, and selective JSON/session data included for server functions.
- Audio/thumb API routes support `LISTENING_AUDIO_BASE_URL` and `THUMB_BASE_URL` redirects so large media does not need to be bundled into Netlify Functions.
