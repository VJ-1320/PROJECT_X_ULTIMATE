'use strict'

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('px', {
  // Window controls
  minimize: ()    => ipcRenderer.send('win-minimize'),
  maximize: ()    => ipcRenderer.send('win-maximize'),
  close:    ()    => ipcRenderer.send('win-close'),
  serverPort: ()  => ipcRenderer.invoke('get-server-port'),

  // Auth
  hasAccount:          ()  => ipcRenderer.invoke('auth-has-account'),
  register:            (d) => ipcRenderer.invoke('auth-register', d),
  loginPassword:       (d) => ipcRenderer.invoke('auth-login-password', d),
  loginPin:            (d) => ipcRenderer.invoke('auth-login-pin', d),
  getProfile:          ()  => ipcRenderer.invoke('auth-get-profile'),
  setPin:              (d) => ipcRenderer.invoke('auth-set-pin', d),
  saveBiometric:       (d) => ipcRenderer.invoke('auth-save-biometric', d),
  getBiometricCred:    ()  => ipcRenderer.invoke('auth-get-biometric-cred'),
  getBiometricEnabled: ()  => ipcRenderer.invoke('auth-get-biometric-enabled'),
  updatePassword:      (d) => ipcRenderer.invoke('auth-update-password', d),
  getAuditLog:         (o) => ipcRenderer.invoke('auth-get-audit-log', o),

  // Settings
  getSettings: ()    => ipcRenderer.invoke('settings-get'),
  setSettings: (p)   => ipcRenderer.invoke('settings-set', p),

  // Data
  readData:  (k)     => ipcRenderer.invoke('read-data', k),
  writeData: (k, v)  => ipcRenderer.invoke('write-data', k, v),

  // Sysinfo
  getSysinfo: ()     => ipcRenderer.invoke('get-sysinfo'),

  // App launcher
  launchApp:   (p)   => ipcRenderer.invoke('launch-app', p),
  pickAppPath: ()    => ipcRenderer.invoke('pick-app-path'),

  // Portfolio
  pickImages:      ()  => ipcRenderer.invoke('pick-images'),
  importImage:     (p) => ipcRenderer.invoke('import-image', p),
  deleteImageFile: (p) => ipcRenderer.invoke('delete-image-file', p),

  // Music
  pickMusicFolder: ()  => ipcRenderer.invoke('pick-music-folder'),
  scanMusic:       (p) => ipcRenderer.invoke('scan-music', p),

  // Study Hub
  saveCanvasExport: (d) => ipcRenderer.invoke('save-canvas-export', d),
})
