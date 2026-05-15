"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface HighlightRange {
  id: string;
  partIdx: number;
  containerKey: string;
  startOffset: number;
  endOffset: number;
  text: string;
}

interface HighlightsContextValue {
  add: (highlight: Omit<HighlightRange, "id">) => HighlightRange;
  remove: (id: string) => void;
  getForContainer: (partIdx: number, containerKey: string) => HighlightRange[];
}

const HighlightsContext = createContext<HighlightsContextValue | null>(null);

export function HighlightsProvider({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<HighlightRange[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {}
  }, [items, storageKey]);

  const add = useCallback((highlight: Omit<HighlightRange, "id">) => {
    const item = { ...highlight, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    setItems((prev) => [...prev, item]);
    return item;
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getForContainer = useCallback(
    (partIdx: number, containerKey: string) =>
      items.filter((item) => item.partIdx === partIdx && item.containerKey === containerKey),
    [items],
  );

  const value = useMemo(() => ({ add, remove, getForContainer }), [add, remove, getForContainer]);

  return <HighlightsContext.Provider value={value}>{children}</HighlightsContext.Provider>;
}

export function useHighlightsStore() {
  return useContext(HighlightsContext);
}
