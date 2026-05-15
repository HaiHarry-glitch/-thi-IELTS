import { getListeningIndex, getListeningListIndex } from "@/lib/data";
import LibraryClient from "../reading/LibraryClient";

export default function ListeningLibraryPage() {
  const listItems = getListeningListIndex();
  const indexSummary = getListeningIndex().filter((item) => item.questions > 0);
  const summaryMap = new Map(indexSummary.map((item) => [item.id, item]));
  const validIds = new Set(indexSummary.map((item) => item.id));
  const visibleItems = Array.from(
    new Map(listItems.filter((item) => validIds.has(item.id)).map((item) => [item.id, item])).values()
  );

  const tagMap = new Map<string, { id: number; code: string; title: string }>();
  for (const item of visibleItems) {
    for (const t of item.tags || []) {
      if (!tagMap.has(t.code)) tagMap.set(t.code, t);
    }
  }
  const allTags = Array.from(tagMap.values()).sort((a, b) => a.title.localeCompare(b.title));

  const items = visibleItems.map((item) => ({ ...item, questions: summaryMap.get(item.id)?.questions ?? 0 }));

  return <LibraryClient items={items} allTags={allTags} skill="listening" />;
}
