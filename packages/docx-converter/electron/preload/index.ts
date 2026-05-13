import { contextBridge, ipcRenderer } from "electron";

export interface ElectronAPI {
  openFile: () => Promise<{
    filePath: string;
    buffer: Uint8Array<ArrayBuffer>;
    name: string;
  } | null>;
  saveFile: (defaultName: string) => Promise<string | null>;
  writeFile: (filePath: string, buffer: Uint8Array<ArrayBuffer>) => Promise<void>;
  watchFile: (filePath: string) => Promise<void>;
  unwatchFile: () => Promise<void>;
  onFileChanged: (
    cb: (data: { filePath: string; buffer: Uint8Array<ArrayBuffer>; name: string }) => void,
  ) => void;
  removeFileChangedListeners: () => void;
}

const api: ElectronAPI = {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: (defaultName) => ipcRenderer.invoke("dialog:saveFile", defaultName),
  writeFile: (filePath, buffer) =>
    ipcRenderer.invoke("file:write", filePath, buffer),
  watchFile: (filePath) => ipcRenderer.invoke("file:watch", filePath),
  unwatchFile: () => ipcRenderer.invoke("file:unwatch"),
  onFileChanged: (cb) => {
    ipcRenderer.on("file:changed", (_, data) => cb(data));
  },
  removeFileChangedListeners: () => {
    ipcRenderer.removeAllListeners("file:changed");
  },
};

contextBridge.exposeInMainWorld("electron", api);
