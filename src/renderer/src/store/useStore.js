import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Auth ─────────────────────────────────────────────
  user: null,         // { username, clearanceLevel, clearanceName }
  isAuthed: false,
  serverPort: null,

  setUser: (user) => set({ user, isAuthed: true }),
  logout:  ()     => set({ user: null, isAuthed: false }),
  setServerPort: (p) => set({ serverPort: p }),

  // ── Navigation ────────────────────────────────────────
  activeView: 'dashboard',
  setView: (v) => set({ activeView: v }),

  // ── Settings ──────────────────────────────────────────
  settings: { theme: 'dark', sidebarExpanded: false },
  setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),

  // ── Status bar ────────────────────────────────────────
  statusMsg: 'SYSTEM READY',
  setStatus: (msg) => set({ statusMsg: msg }),

  // ── Data ──────────────────────────────────────────────
  apps:    [],
  todos:   [],
  notes:   [],
  tracks:  [],
  setApps:   (a) => set({ apps: a }),
  setTodos:  (t) => set({ todos: t }),
  setNotes:  (n) => set({ notes: n }),
  setTracks: (t) => set({ tracks: t }),
}))
