/// <reference types="vite/client" />

declare module "*.css" {
  const css: string;
  export default css;
}

declare module "*?worker" {
  const WorkerCtor: new () => Worker;
  export default WorkerCtor;
}

interface FileTreeNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
}

interface ElectronAPI {
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

  configParse: (source: string) => Promise<{
    title?: string;
    author?: string;
    language?: string;
    readingProgression?: "ltr" | "rtl";
    size?: string;
    theme?: string;
    image?: string;
    browser?: string;
    entry?: Array<{
      path: string;
      title?: string;
      theme?: string;
      rel?: string;
      encodingFormat?: string;
    }>;
    unknownKeys: string[];
  }>;
  configSerialize: (source: string, data: unknown) => Promise<string>;
}

interface Window {
  electron?: ElectronAPI;
}
