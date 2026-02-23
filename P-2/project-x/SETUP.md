# ⌘ PROJECT X ULTIMATE — SETUP

## STACK
- **Runtime**: Electron 28 (frameless window)
- **Build**: electron-vite + Vite 5
- **UI**: React 18 + Tailwind CSS 3
- **Auth**: `@node-rs/argon2` (Argon2id, 64MB memory cost)
- **Database**: `better-sqlite3` (WAL mode, 4-level RBAC)
- **Map**: Leaflet + CartoDB dark tiles
- **Study Hub**: Infinite canvas, Pointer Events API, pressure sensitivity

---

## QUICK START

```bash
# 1. Install dependencies
npm install

# NOTE: better-sqlite3 is a native module.
# postinstall automatically runs electron-rebuild.
# If it fails: npm run rebuild

# 2. Dev mode (hot reload)
npm run dev

# 3. Production build
npm run build && npm start
```

---

## FIRST LAUNCH — DIRECTOR SETUP

1. The **first account created gets Level 4 (Director/SAP)** clearance automatically
2. Choose a strong username + password (≥6 chars)
3. Optionally set a PIN (Settings → Security) and Windows Hello biometric

---

## CLEARANCE LEVELS (4-Tier RBAC)

| Level | Name           | Badge Color |
|-------|----------------|-------------|
| 1     | UNCLASSIFIED   | Gray        |
| 2     | RESTRICTED     | Amber ★ default |
| 3     | CLASSIFIED     | Blue        |
| 4     | DIRECTOR / SAP | Cyan (first user) |

---

## AUTH OPTIONS

| Method | How |
|--------|-----|
| **Password** | Argon2id hashed (64MB mem cost) |
| **PIN** | 4-digit, Argon2id hashed |
| **Windows Hello** | WebAuthn via 127.0.0.1 local server |

---

## STUDY HUB KEYBOARD SHORTCUTS

| Key | Action |
|-----|--------|
| P | Pen tool |
| E | Eraser |
| H | Hand / Pan |
| L | Line |
| R | Rectangle |
| C | Circle |
| Ctrl+Z | Undo |
| 0 | Reset view |
| Scroll | Zoom in/out |

---

## DATA LOCATIONS

| OS | Path |
|----|------|
| Windows | `%APPDATA%\project-x-ultimate\` |
| Mac | `~/Library/Application Support/project-x-ultimate/` |
| Linux | `~/.config/project-x-ultimate/` |

- `px_secure.db` — SQLite database (auth, users, audit log, settings)
- `px_data/` — JSON data files (apps, todos, notes, etc.)
- `px_images/` — Imported portfolio images

---

## TROUBLESHOOTING

**better-sqlite3 fails to load**
```bash
npm run rebuild
```

**Argon2 errors**
`@node-rs/argon2` uses NAPI-RS prebuilt binaries — no rebuild needed.
If it fails: `npm install @node-rs/argon2 --force`

**WebAuthn / Windows Hello not working**
Requires a physical IR camera or fingerprint reader + Windows 10 1903+.
The app runs on `http://127.0.0.1` (localhost) which is a valid WebAuthn origin.

---

## DEVELOPMENT PIPELINE (per Master Protocol)

1. **VS Code Insiders** — local IDE
2. **Claude Sonnet** — heavy syntax generation / base logic ✓ (this file)
3. **Google AI Studio** — iterative assembly, debugging, memory retention
