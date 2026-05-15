/**
 * Strip source-prefix brackets from quiz titles.
 * e.g. "[HIN Collect] - Child's Play in Medieval England" → "Child's Play in Medieval England"
 * e.g. "[C20T4] Some title" â†’ "Some title"
 */
export function cleanTitle(title: string): string {
  const cleaned = title
    .replace(/^\[.+?\]\s*[-–]?\s*/, "")
    .replace(/\((Reading|Listening)\)\s*-\s*\1$/i, "($1)")
    .trim();
  return cleaned || title;
}

/**
 * Extract the source tag from a bracketed prefix, e.g. "[Cambridge 20 Test 4]" â†’ "C20T4"
 * Returns null if no prefix found.
 */
export function titleSource(title: string): string | null {
  const m = title.match(/^\[(.+?)\]/);
  return m ? m[1].trim() : null;
}

