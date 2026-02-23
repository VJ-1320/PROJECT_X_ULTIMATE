"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("px", {
  // Window controls
  minimize: () => electron.ipcRenderer.send("win-minimize"),
  maximize: () => electron.ipcRenderer.send("win-maximize"),
  close: () => electron.ipcRenderer.send("win-close"),
  serverPort: () => electron.ipcRenderer.invoke("get-server-port"),
  // Auth
  hasAccount: () => electron.ipcRenderer.invoke("auth-has-account"),
  register: (d) => electron.ipcRenderer.invoke("auth-register", d),
  loginPassword: (d) => electron.ipcRenderer.invoke("auth-login-password", d),
  loginPin: (d) => electron.ipcRenderer.invoke("auth-login-pin", d),
  getProfile: () => electron.ipcRenderer.invoke("auth-get-profile"),
  setPin: (d) => electron.ipcRenderer.invoke("auth-set-pin", d),
  saveBiometric: (d) => electron.ipcRenderer.invoke("auth-save-biometric", d),
  getBiometricCred: () => electron.ipcRenderer.invoke("auth-get-biometric-cred"),
  getBiometricEnabled: () => electron.ipcRenderer.invoke("auth-get-biometric-enabled"),
  updatePassword: (d) => electron.ipcRenderer.invoke("auth-update-password", d),
  getAuditLog: (o) => electron.ipcRenderer.invoke("auth-get-audit-log", o),
  // Settings
  getSettings: () => electron.ipcRenderer.invoke("settings-get"),
  setSettings: (p) => electron.ipcRenderer.invoke("settings-set", p),
  // Data
  readData: (k) => electron.ipcRenderer.invoke("read-data", k),
  writeData: (k, v) => electron.ipcRenderer.invoke("write-data", k, v),
  // Sysinfo
  getSysinfo: () => electron.ipcRenderer.invoke("get-sysinfo"),
  // App launcher
  launchApp: (p) => electron.ipcRenderer.invoke("launch-app", p),
  pickAppPath: () => electron.ipcRenderer.invoke("pick-app-path"),
  // Portfolio
  pickImages: () => electron.ipcRenderer.invoke("pick-images"),
  importImage: (p) => electron.ipcRenderer.invoke("import-image", p),
  deleteImageFile: (p) => electron.ipcRenderer.invoke("delete-image-file", p),
  // Music
  pickMusicFolder: () => electron.ipcRenderer.invoke("pick-music-folder"),
  scanMusic: (p) => electron.ipcRenderer.invoke("scan-music", p),
  // Study Hub
  saveCanvasExport: (d) => electron.ipcRenderer.invoke("save-canvas-export", d)
});
electron.contextBridge.exposeInMainWorld("security", {
  linkHardware: (username) => electron.ipcRenderer.invoke("security:link-hardware", username),
  verifyHardware: (data) => electron.ipcRenderer.invoke("security:verify-hardware", data)
});
