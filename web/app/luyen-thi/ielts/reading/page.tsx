import { getListIndex, getIndex, IndexItem } from "@/lib/data";
import LibraryClient from "./LibraryClient";

export default function ReadingLibraryPage() {
  const listItems = getListIndex();
  const indexSummary = getIndex();
  const summaryMap = new Map(indexSummary.map((s) => [s.id, s]));
  const validIds = new Set(indexSummary.map((s) => s.id));
  const visibleItems = Array.from(
    new Map(listItems.filter((item) => validIds.has(item.id)).map((item) => [item.id, item])).values()
  );

  // Gather all unique tags
  const tagMap = new Map<string, { id: number; code: string; title: string }>();
  for (const item of visibleItems) {
    for (const t of item.tags || []) {
      if (!tagMap.has(t.code)) tagMap.set(t.code, t);
    }
  }
  const allTags = Array.from(tagMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  const items = visibleItems.map((item) => ({
    ...item,
    questions: summaryMap.get(item.id)?.questions ?? 0,
  }));

  return <LibraryClient items={items} allTags={allTags} />;
}
