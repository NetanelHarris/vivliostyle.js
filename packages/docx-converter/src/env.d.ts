declare module "*.css" {
  const css: string;
  export default css;
}

interface ElectronAPI {
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
    cb: (data: {
      filePath: string;
      buffer: Uint8Array<ArrayBuffer>;
      name: string;
    }) => void,
  ) => void;
  removeFileChangedListeners: () => void;
}

interface Window {
  electron?: ElectronAPI;
}
