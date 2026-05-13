import { contextBridge, ipcRenderer } from "electron";

export interface FileTreeNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
}

export interface ElectronAPI {
  // existing DOCX flow
  openFile: () => Promise<{
    filePath: string;
    buffer: Uint8Array<ArrayBuffer>;
    name: string;
  } | null>;
  saveFile: (defaultName: string) => Promise<string | null>;
  writeFile: (
    filePath: string,
    buffer: Uint8Array<ArrayBuffer>,
  ) => Promise<void>;
  watchFile: (filePath: string) => Promise<void>;
  unwatchFile: () => Promise<void>;
  onFileChanged: (
    cb: (data: {
      filePath: string;
      buffer: Uint8Array<ArrayBuffer>;
      name: string;
    }) => void,
  ) => void;
  removeFileChangedListeners: () => void;

  // project / fs APIs
  openDirectory: () => Promise<string | null>;
  fsReadDir: (dirPath: string) => Promise<FileTreeNode>;
  fsReadFile: (
    filePath: string,
    encoding?: BufferEncoding,
  ) => Promise<string | Uint8Array>;
  fsWriteFile: (
    filePath: string,
    content: string | Uint8Array,
  ) => Promise<void>;
  fsMkdir: (dirPath: string) => Promise<void>;
  fsRename: (oldPath: string, newPath: string) => Promise<void>;
  fsDelete: (filePath: string) => Promise<void>;
  fsExists: (path: string) => Promise<boolean>;
  fsWatchDir: (dirPath: string) => Promise<void>;
  fsUnwatchDir: () => Promise<void>;
  onDirChanged: (cb: (data: { dirPath: string }) => void) => void;
  onProjectFileChanged: (cb: (data: { filePath: string }) => void) => void;
  removeProjectListeners: () => void;

  // Vivliostyle CLI
  vivPreviewStart: (
    projectDir: string,
  ) => Promise<{ port: number; url: string }>;
  vivPreviewStop: () => Promise<void>;
  vivPreviewStatus: () => Promise<{
    port: number;
    url: string;
    projectDir: string;
  } | null>;
  saveAs: (options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;
  vivBuild: (
    projectDir: string,
    output: string,
    extraArgs?: string[],
  ) => Promise<{ code: number | null; error?: string }>;
  onVivLog: (
    cb: (data: { stream: "stdout" | "stderr"; text: string }) => void,
  ) => void;
  onVivPreviewExit: (cb: (data: { code: number | null }) => void) => void;
  removeVivListeners: () => void;

  // vivliostyle.config.js codec (Babel runs in main)
  configParse: (source: string) => Promise<unknown>;
  configSerialize: (source: string, data: unknown) => Promise<string>;
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

  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  fsReadDir: (dirPath) => ipcRenderer.invoke("fs:readDir", dirPath),
  fsReadFile: (filePath, encoding) =>
    ipcRenderer.invoke("fs:readFile", filePath, encoding),
  fsWriteFile: (filePath, content) =>
    ipcRenderer.invoke("fs:writeFile", filePath, content),
  fsMkdir: (dirPath) => ipcRenderer.invoke("fs:mkdir", dirPath),
  fsRename: (oldPath, newPath) =>
    ipcRenderer.invoke("fs:rename", oldPath, newPath),
  fsDelete: (filePath) => ipcRenderer.invoke("fs:delete", filePath),
  fsExists: (path) => ipcRenderer.invoke("fs:exists", path),
  fsWatchDir: (dirPath) => ipcRenderer.invoke("fs:watchDir", dirPath),
  fsUnwatchDir: () => ipcRenderer.invoke("fs:unwatchDir"),
  onDirChanged: (cb) => {
    ipcRenderer.on("fs:dirChanged", (_, data) => cb(data));
  },
  onProjectFileChanged: (cb) => {
    ipcRenderer.on("fs:fileChanged", (_, data) => cb(data));
  },
  removeProjectListeners: () => {
    ipcRenderer.removeAllListeners("fs:dirChanged");
    ipcRenderer.removeAllListeners("fs:fileChanged");
  },

  saveAs: (options) => ipcRenderer.invoke("dialog:saveAs", options),
  vivPreviewStart: (projectDir) =>
    ipcRenderer.invoke("viv:preview:start", projectDir),
  vivPreviewStop: () => ipcRenderer.invoke("viv:preview:stop"),
  vivPreviewStatus: () => ipcRenderer.invoke("viv:preview:status"),
  vivBuild: (projectDir, output, extraArgs) =>
    ipcRenderer.invoke("viv:build", projectDir, output, extraArgs ?? []),
  onVivLog: (cb) => {
    ipcRenderer.on("viv:log", (_, data) => cb(data));
  },
  onVivPreviewExit: (cb) => {
    ipcRenderer.on("viv:preview:exit", (_, data) => cb(data));
  },
  removeVivListeners: () => {
    ipcRenderer.removeAllListeners("viv:log");
    ipcRenderer.removeAllListeners("viv:preview:exit");
  },

  configParse: (source) => ipcRenderer.invoke("config:parse", source),
  configSerialize: (source, data) =>
    ipcRenderer.invoke("config:serialize", source, data),
};

contextBridge.exposeInMainWorld("electron", api);
