'use strict'

import { app, shell, BrowserWindow, ipcMain, safeStorage, dialog } from 'electron'
import crypto from 'crypto'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, unlinkSync, statSync, readdirSync, createReadStream } from 'fs'
import { platform, hostname, totalmem, freemem, uptime, cpus, userInfo, arch } from 'os'
import { createServer } from 'http'
import Database from 'better-sqlite3'
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2'

// ── Constants ──────────────────────────────────────────────────────────────────
const CLEARANCE = {
  1: 'UNCLASSIFIED',
  2: 'RESTRICTED',
  3: 'CLASSIFIED',
  4: 'DIRECTOR / SAP',
}

const ARGON2_OPTIONS = {
  memoryCost: 65536,   // 64 MB
  timeCost:   3,
  parallelism: 2,
}

let win, localServer, serverPort
const musicFileMap = new Map()

// ── Database ───────────────────────────────────────────────────────────────────
let db

function initDatabase() {
  const dbPath = join(app.getPath('userData'), 'px_secure.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      username                TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash           TEXT NOT NULL,
      pin_hash                TEXT,
      clearance_level         INTEGER NOT NULL DEFAULT 2
                              CHECK(clearance_level BETWEEN 1 AND 4),
      biometric_enabled       INTEGER NOT NULL DEFAULT 0,
      biometric_credential_id TEXT,
      hardware_hash           TEXT DEFAULT NULL,
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      last_login              TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER,
      username    TEXT,
      action      TEXT NOT NULL,
      result      TEXT NOT NULL CHECK(result IN ('SUCCESS','FAILURE','WARNING')),
      metadata    TEXT,
      ip          TEXT DEFAULT '127.0.0.1',
      timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_ts   ON audit_log(timestamp);
  `)
  
  // Retroactive column addition for existing databases
  try {
    db.exec(`ALTER TABLE users ADD COLUMN hardware_hash TEXT DEFAULT NULL;`);
  } catch (e) {
    // Column already exists, safe to ignore
  }
}

// ── Audit Logging ──────────────────────────────────────────────────────────────
function audit(userId, username, action, result, metadata = null) {
  db.prepare(`
    INSERT INTO audit_log (user_id, username, action, result, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, username, action, result, metadata ? JSON.stringify(metadata) : null)

  // Flag privilege escalation attempts
  if (action.includes('CLEARANCE_ESCALATION') || result === 'FAILURE') {
    console.warn(`[AUDIT] ${result} | ${action} | user=${username} | ${new Date().toISOString()}`)
  }
}

// ── Local HTTP Server ──────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.mp3':  'audio/mpeg',
  '.flac': 'audio/flac',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.m4a':  'audio/mp4',
  '.aac':  'audio/aac',
  '.opus': 'audio/ogg',
}

function createLocalServer() {
  return new Promise((resolve) => {
    localServer = createServer((req, res) => {
      const reqPath = decodeURIComponent(req.url.split('?')[0])
      let filePath

      if (reqPath.startsWith('/userdata/')) {
        filePath = join(app.getPath('userData'), reqPath.slice('/userdata/'.length))
      } else if (reqPath.startsWith('/musicfile/')) {
        const key = reqPath.slice('/musicfile/'.length)
        filePath  = musicFileMap.get(key)
        if (!filePath) { res.writeHead(404); res.end('Track not found'); return }
      } else {
        res.writeHead(404); res.end('Not found'); return
      }

      if (!filePath || !existsSync(filePath)) {
        res.writeHead(404); res.end('File not found'); return
      }

      const ext  = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
      const mime = MIME[ext] || 'application/octet-stream'
      const size = statSync(filePath).size
      const range = req.headers.range

      if (range && mime.startsWith('audio')) {
        const [s, e] = range.replace(/bytes=/, '').split('-')
        const start  = parseInt(s, 10)
        const end    = e ? parseInt(e, 10) : size - 1
        res.writeHead(206, {
          'Content-Range':  `bytes ${start}-${end}/${size}`,
          'Accept-Ranges':  'bytes',
          'Content-Length': end - start + 1,
          'Content-Type':   mime,
        })
        createReadStream(filePath, { start, end }).pipe(res)
      } else {
        res.writeHead(200, { 'Content-Type': mime, 'Content-Length': size, 'Accept-Ranges': 'bytes' })
        createReadStream(filePath).pipe(res)
      }
    })

    localServer.listen(0, '127.0.0.1', () => {
      serverPort = localServer.address().port
      resolve(serverPort)
    })
  })
}

// ── Window ─────────────────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    frame: false,
    backgroundColor: '#03030a',
    webPreferences: {
      preload:          join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await createLocalServer()
  initDatabase()
  createWindow()
})

app.on('window-all-closed', () => { if (platform() !== 'darwin') app.quit() })
app.on('before-quit',       () => { localServer?.close(); db?.close() })
app.on('activate',          () => { if (!BrowserWindow.getAllWindows().length) createWindow() })

// ── Window Controls ────────────────────────────────────────────────────────────
ipcMain.on('win-minimize', () => win?.minimize())
ipcMain.on('win-maximize', () => win?.isMaximized() ? win.unmaximize() : win.maximize())
ipcMain.on('win-close',    () => win?.close())
ipcMain.handle('get-server-port', () => serverPort)

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH IPC HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('auth-has-account', () => {
  return !!db.prepare('SELECT 1 FROM users LIMIT 1').get()
})

ipcMain.handle('auth-register', async (_e, { username, password }) => {
  try {
    if (!username?.trim() || !password) throw new Error('Missing credentials')
    if (username.trim().length < 3)     throw new Error('Username must be at least 3 characters')
    if (password.length < 6)            throw new Error('Password must be at least 6 characters')

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim())
    if (existing) throw new Error('Username already exists')

    const passwordHash = await argonHash(password, ARGON2_OPTIONS)
    const isFirstUser  = !db.prepare('SELECT 1 FROM users LIMIT 1').get()

    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, clearance_level)
      VALUES (?, ?, ?)
    `)
    const info = stmt.run(username.trim(), passwordHash, isFirstUser ? 4 : 2)

    audit(info.lastInsertRowid, username.trim(), 'REGISTER', 'SUCCESS')
    return { success: true, username: username.trim(), clearanceLevel: isFirstUser ? 4 : 2, clearanceName: CLEARANCE[isFirstUser ? 4 : 2] }
  } catch (e) {
    audit(null, username, 'REGISTER', 'FAILURE', { error: e.message })
    return { error: e.message }
  }
})

ipcMain.handle('auth-login-password', async (_e, { password }) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY id ASC').all()
    if (!users.length) return { error: 'No account found. Please register.' }

    const user = users[0]  
    const valid = await argonVerify(user.password_hash, password)

    if (!valid) {
      audit(user.id, user.username, 'LOGIN_PASSWORD', 'FAILURE')
      return { error: 'Incorrect password' }
    }

    db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id)
    audit(user.id, user.username, 'LOGIN_PASSWORD', 'SUCCESS')

    return {
      success:       true,
      username:      user.username,
      clearanceLevel: user.clearance_level,
      clearanceName: CLEARANCE[user.clearance_level],
    }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('auth-login-pin', async (_e, { pin }) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE pin_hash IS NOT NULL ORDER BY id ASC').get()
    if (!user) return { error: 'PIN not configured' }

    const valid = await argonVerify(user.pin_hash, pin)
    if (!valid) {
      audit(user.id, user.username, 'LOGIN_PIN', 'FAILURE')
      return { error: 'Incorrect PIN' }
    }

    db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id)
    audit(user.id, user.username, 'LOGIN_PIN', 'SUCCESS')

    return {
      success:        true,
      username:       user.username,
      clearanceLevel: user.clearance_level,
      clearanceName:  CLEARANCE[user.clearance_level],
    }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('auth-get-profile', () => {
  const user = db.prepare('SELECT id, username, clearance_level, biometric_enabled, created_at, last_login FROM users ORDER BY id ASC').get()
  if (!user) return null
  return {
    id:            user.id,
    username:      user.username,
    clearanceLevel: user.clearance_level,
    clearanceName: CLEARANCE[user.clearance_level],
    biometricEnabled: !!user.biometric_enabled,
    createdAt:     user.created_at,
    lastLogin:     user.last_login,
  }
})

ipcMain.handle('auth-set-pin', async (_e, { pin }) => {
  try {
    const user = db.prepare('SELECT id, username FROM users ORDER BY id ASC').get()
    if (!user) return { error: 'No account found' }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return { error: 'PIN must be exactly 4 digits' }

    const pinHash = await argonHash(pin, { memoryCost: 32768, timeCost: 2, parallelism: 1 })
    db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(pinHash, user.id)
    audit(user.id, user.username, 'SET_PIN', 'SUCCESS')
    return { success: true }
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('auth-save-biometric', (_e, { credentialId }) => {
  const user = db.prepare('SELECT id, username FROM users ORDER BY id ASC').get()
  if (!user) return { error: 'No account' }
  db.prepare('UPDATE users SET biometric_enabled = 1, biometric_credential_id = ? WHERE id = ?').run(credentialId, user.id)
  audit(user.id, user.username, 'SETUP_BIOMETRIC', 'SUCCESS')
  return { success: true }
})

ipcMain.handle('auth-get-biometric-cred', () => {
  const user = db.prepare('SELECT biometric_credential_id FROM users WHERE biometric_enabled = 1').get()
  return user?.biometric_credential_id || null
})

ipcMain.handle('auth-get-biometric-enabled', () => {
  return !!db.prepare('SELECT 1 FROM users WHERE biometric_enabled = 1').get()
})

ipcMain.handle('auth-update-password', async (_e, { currentPassword, newPassword }) => {
  try {
    const user = db.prepare('SELECT * FROM users ORDER BY id ASC').get()
    if (!user) return { error: 'No account' }

    const valid = await argonVerify(user.password_hash, currentPassword)
    if (!valid) {
      audit(user.id, user.username, 'CHANGE_PASSWORD', 'FAILURE')
      return { error: 'Current password is incorrect' }
    }

    const newHash = await argonHash(newPassword, ARGON2_OPTIONS)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id)
    audit(user.id, user.username, 'CHANGE_PASSWORD', 'SUCCESS')
    return { success: true }
  } catch (e) {
    return { error: e.message }
  }
})

// RBAC — clearance management (Director-only)
ipcMain.handle('auth-set-clearance', (_e, { targetUserId, newLevel, requestingUserId }) => {
  const requester = db.prepare('SELECT clearance_level FROM users WHERE id = ?').get(requestingUserId)
  if (!requester || requester.clearance_level < 4) {
    audit(requestingUserId, 'UNKNOWN', 'CLEARANCE_ESCALATION', 'FAILURE', { targetUserId, newLevel })
    return { error: 'UNAUTHORIZED — Director clearance required' }
  }
  if (newLevel < 1 || newLevel > 4) return { error: 'Invalid clearance level' }
  db.prepare('UPDATE users SET clearance_level = ? WHERE id = ?').run(newLevel, targetUserId)
  audit(requestingUserId, null, 'CLEARANCE_CHANGE', 'SUCCESS', { targetUserId, newLevel })
  return { success: true }
})

ipcMain.handle('auth-get-audit-log', (_e, { limit = 50 } = {}) => {
  return db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?').all(limit)
})

// ══════════════════════════════════════════════════════════════════════════════
//  HARDWARE BIOMETRIC PROTOCOL (WINDOWS HELLO/TOUCH ID)
// ══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('security:link-hardware', async (event, username) => {
  try {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = await argonHash(rawToken, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });
    
    // Note: using 'users' table to match your existing schema instead of 'operatives'
    const stmt = db.prepare('UPDATE users SET hardware_hash = ? WHERE username = ?');
    stmt.run(hash, username);

    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS Secure Enclave not available.');
    const encryptedBuffer = safeStorage.encryptString(rawToken);
    
    return { success: true, encryptedToken: encryptedBuffer.toString('base64') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('security:verify-hardware', async (event, { username, encryptedTokenBase64 }) => {
  try {
    const stmt = db.prepare('SELECT id, hardware_hash, clearance_level FROM users WHERE username = ?');
    const user = stmt.get(username);

    if (!user || !user.hardware_hash) return { success: false, error: 'No hardware linked.' };

    const encryptedBuffer = Buffer.from(encryptedTokenBase64, 'base64');
    const decryptedToken = safeStorage.decryptString(encryptedBuffer); // Triggers OS biometric prompt
    
    const isValid = await argonVerify(user.hardware_hash, decryptedToken);
    if (isValid) {
      db.prepare("INSERT INTO audit_log (user_id, username, action, result, ip) VALUES (?, ?, 'BIOMETRIC_AUTH', 'SUCCESS', '127.0.0.1')").run(user.id, username);
      return { 
        success: true, 
        user: { 
          id: user.id, 
          username: username, 
          clearanceLevel: user.clearance_level,
          clearanceName: CLEARANCE[user.clearance_level]
        } 
      };
    }
    throw new Error('Cryptographic mismatch');
  } catch (error) {
    return { success: false, error: 'Biometric decryption failed. Unauthorized.' };
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_SETTINGS = { theme: 'dark', sidebarExpanded: false, studyZoomLevel: 1 }

ipcMain.handle('settings-get', () => {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const result = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    try { result[row.key] = JSON.parse(row.value) } catch { result[row.key] = row.value }
  }
  return result
})

ipcMain.handle('settings-set', (_e, patch) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(patch)) {
    upsert.run(key, JSON.stringify(value))
  }
  return true
})

// ══════════════════════════════════════════════════════════════════════════════
//  DATA STORE (generic JSON per key)
// ══════════════════════════════════════════════════════════════════════════════

function dataDir() {
  const d = join(app.getPath('userData'), 'px_data')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

ipcMain.handle('read-data', (_e, key) => {
  const f = join(dataDir(), `${key}.json`)
  if (!existsSync(f)) return null
  try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null }
})

ipcMain.handle('write-data', (_e, key, val) => {
  writeFileSync(join(dataDir(), `${key}.json`), JSON.stringify(val, null, 2))
  return true
})

// ══════════════════════════════════════════════════════════════════════════════
//  SYSTEM INFO
// ══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('get-sysinfo', () => {
  const c = cpus()
  return {
    platform:  platform(),
    hostname:  hostname(),
    uptime:    Math.floor(uptime()),
    memory:    { total: totalmem(), free: freemem() },
    cpuModel:  c[0]?.model?.split('@')[0]?.trim() || 'Unknown',
    cpuCores:  c.length,
    arch:      arch(),
    user:      userInfo().username,
  }
})

// ══════════════════════════════════════════════════════════════════════════════
//  APP LAUNCHER
// ══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('launch-app', async (_e, appPath) => {
  if (!appPath) return { error: 'No path configured' }
  try {
    if (/^https?:\/\//.test(appPath)) await shell.openExternal(appPath)
    else { const r = await shell.openPath(appPath); if (r) return { error: r } }
    return { success: true }
  } catch (e) { return { error: e.message } }
})

ipcMain.handle('pick-app-path', async () => {
  const ext = platform() === 'win32' ? ['exe', 'lnk', 'bat', 'cmd']
            : platform() === 'darwin' ? ['app'] : ['sh', 'AppImage', 'desktop']
  const r = await dialog.showOpenDialog(win, {
    title: 'Select Application',
    properties: ['openFile'],
    filters: [{ name: 'Applications', extensions: ext }, { name: 'All Files', extensions: ['*'] }],
  })
  return r.canceled ? null : r.filePaths[0]
})

// ══════════════════════════════════════════════════════════════════════════════
//  PORTFOLIO / IMAGES
// ══════════════════════════════════════════════════════════════════════════════

function imgDir() {
  const d = join(app.getPath('userData'), 'px_images')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

ipcMain.handle('pick-images', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Import Images',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'] }],
  })
  return r.canceled ? [] : r.filePaths
})

ipcMain.handle('import-image', async (_e, srcPath) => {
  const ext  = srcPath.slice(srcPath.lastIndexOf('.'))
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
  const dest = join(imgDir(), name)
  copyFileSync(srcPath, dest)
  return { serverPath: `/userdata/px_images/${name}`, name: srcPath.split(/[\\/]/).pop(), size: statSync(dest).size }
})

ipcMain.handle('delete-image-file', (_e, serverPath) => {
  try {
    const full = join(imgDir(), serverPath.split(/[\\/]/).pop())
    if (existsSync(full)) unlinkSync(full)
    return true
  } catch { return false }
})

// ══════════════════════════════════════════════════════════════════════════════
//  MUSIC
// ══════════════════════════════════════════════════════════════════════════════

const MUSIC_EXTS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.opus']

ipcMain.handle('pick-music-folder', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Select Music Folder', properties: ['openDirectory'] })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle('scan-music', (_e, dirPath) => {
  const tracks = []
  function walk(dir, depth = 0) {
    if (depth > 5 || tracks.length >= 5000) return
    try {
      for (const item of readdirSync(dir)) {
        if (item.startsWith('.')) continue
        const full = join(dir, item)
        try {
          const stat = statSync(full)
          if (stat.isDirectory()) { walk(full, depth + 1) }
          else {
            const ext = item.slice(item.lastIndexOf('.')).toLowerCase()
            if (MUSIC_EXTS.includes(ext)) {
              const key = encodeURIComponent(full)
              musicFileMap.set(key, full)
              tracks.push({
                id:         `tr_${tracks.length}`,
                serverPath: `/musicfile/${key}`,
                name:       item.slice(0, item.lastIndexOf('.')),
                folder:     dir.split(/[\\/]/).pop(),
                ext:        ext.slice(1).toUpperCase(),
                size:       stat.size,
              })
            }
          }
        } catch {}
        if (tracks.length >= 5000) return
      }
    } catch {}
  }
  walk(dirPath)
  return tracks
})

// ══════════════════════════════════════════════════════════════════════════════
//  STUDY HUB — Canvas Export
// ══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('save-canvas-export', async (_e, { dataURL, filename }) => {
  const r = await dialog.showSaveDialog(win, {
    title:       'Export Canvas',
    defaultPath: filename || `px-study-${Date.now()}.png`,
    filters:     [{ name: 'PNG Image', extensions: ['png'] }],
  })
  if (r.canceled) return null

  const base64 = dataURL.replace(/^data:image\/\w+;base64,/, '')
  writeFileSync(r.filePath, Buffer.from(base64, 'base64'))
  return r.filePath
})