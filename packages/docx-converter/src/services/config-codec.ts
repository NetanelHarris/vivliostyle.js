// Renderer-side types & thin IPC client. The actual Babel-based parsing happens
// in the main process (see electron/main/config-codec.ts) because @babel/types
// references `process` which is not available in a sandboxed renderer.

export interface ConfigEntry {
  path: string;
  title?: string;
  theme?: string;
  rel?: string;
  encodingFormat?: string;
}

export interface ConfigData {
  title?: string;
  author?: string;
  language?: string;
  readingProgression?: "ltr" | "rtl";
  size?: string;
  theme?: string;
  image?: string;
  browser?: string;
  entry?: ConfigEntry[];
  unknownKeys: string[];
}

export async function parseConfig(source: string): Promise<ConfigData> {
  if (!window.electron) {
    throw new Error("Electron API not available");
  }
  return window.electron.configParse(source);
}

export async function serializeConfig(
  source: string,
  data: ConfigData,
): Promise<string> {
  if (!window.electron) {
    throw new Error("Electron API not available");
  }
  return window.electron.configSerialize(source, data);
}
