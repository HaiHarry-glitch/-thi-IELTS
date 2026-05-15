"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Note {
  id: string;
  quizId: number;
  partIdx: number;
  selectedText: string;
  content: string;
  createdAt: number;
}

interface NotesCtx {
  notes: Note[];
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  addNote: (partIdx: number, selectedText: string) => Note;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
}

const Ctx = createContext<NotesCtx | null>(null);

export function NotesProvider({ quizId, children }: { quizId: number; children: ReactNode }) {
  const STORAGE_KEY = `yp_notes_${quizId}`;
  const [notes, setNotes] = useState<Note[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, hydrated, STORAGE_KEY]);

  function addNote(partIdx: number, selectedText: string): Note {
    const note: Note = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      quizId,
      partIdx,
      selectedText: selectedText.slice(0, 80),
      content: "",
      createdAt: Date.now(),
    };
    setNotes((prev) => [...prev, note]);
    setPanelOpen(true);
    return note;
  }

  function updateNote(id: string, content: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <Ctx.Provider value={{ notes, panelOpen, setPanelOpen, addNote, updateNote, deleteNote }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotes must be used inside <NotesProvider>");
  return ctx;
}
