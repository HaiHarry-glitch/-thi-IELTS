"use client";

import { useNotes } from "./NotesContext";

export default function NotesPanel() {
  const { notes, panelOpen, setPanelOpen, updateNote, deleteNote } = useNotes();

  if (!panelOpen) return null;

  return (
    <aside className="w-[360px] shrink-0 border-l border-[#c1c1c1] bg-white flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center px-4 h-12 border-b border-[#c1c1c1]">
        <span className="font-semibold">Note</span>
        <div className="ml-auto flex items-center gap-3 text-gray-500">
          <button title="Ẩn note">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button onClick={() => setPanelOpen(false)} title="Đóng" className="hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 italic mt-6 text-center">Chưa có note nào. Bôi đen text trong passage rồi click "Note".</p>
        ) : (
          notes.map((n) => (
            <div key={n.id}>
              <div className="text-sm mb-1">
                <span className="font-semibold">Part {n.partIdx + 1}</span>
                <span className="ml-2 text-gray-600">{n.selectedText}</span>
              </div>
              <textarea
                value={n.content}
                onChange={(e) => updateNote(n.id, e.target.value)}
                className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                placeholder=""
              />
              <div className="flex justify-end mt-1">
                <button
                  onClick={() => deleteNote(n.id)}
                  className="text-xs text-gray-500 hover:text-red-500 font-medium tracking-wide"
                >
                  DELETE
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
