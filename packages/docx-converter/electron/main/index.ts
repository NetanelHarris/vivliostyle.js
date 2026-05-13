import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import { watchFile, unwatchFile } from "./file-watcher.js";
import { registerFsHandlers } from "./fs-handlers.js";
import { registerVivliostyleHandlers } from "./vivliostyle.js";
import { registerConfigCodecHandlers } from "./config-codec.js";

let mainWindow: BrowserWindow | null = null;
const detachedWindows = new Map<string, BrowserWindow>();

const PANEL_SIZES: Record<string, { width: number; height: number }> = {
  preview: { width: 1000, height: 800 },
  editor: { width: 900, height: 700 },
  sidebar: { width: 400, height: 700 },
};

function buildPanelUrl(
  panel: string,
  params: { project?: string },
): string | null {
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    const url = new URL(devUrl);
    url.searchParams.set("panel", panel);
    if (params.project) url.searchParams.set("project", params.project);
    return url.toString();
  }
  return null;
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  mainWindow = win;
  registerFsHandlers(() => mainWindow);
  registerVivliostyleHandlers(() => mainWindow);
  registerConfigCodecHandlers();

  ipcMain.handle(
    "window:openPanel",
    async (
      _,
      panel: string,
      params: { project?: string } = {},
    ) => {
      const existing = detachedWindows.get(panel);
      if (existing && !existing.isDestroyed()) {
        existing.focus();
        return;
      }

      const size = PANEL_SIZES[panel] ?? { width: 800, height: 700 };
      const detachedWin = new BrowserWindow({
        width: size.width,
        height: size.height,
        webPreferences: {
          preload: join(__dirname, "../preload/index.js"),
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      const panelUrl = buildPanelUrl(panel, params);
      if (panelUrl) {
        detachedWin.loadURL(panelUrl);
      } else {
        // production: load file with hash params
        const htmlPath = join(__dirname, "../renderer/index.html");
        const query = new URLSearchParams({ panel });
        if (params.project) query.set("project", params.project);
        detachedWin.loadFile(htmlPath, { query: Object.fromEntries(query) });
      }

      detachedWindows.set(panel, detachedWin);

      detachedWin.on("closed", () => {
        detachedWindows.delete(panel);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("window:panelClosed", { panel });
        }
      });
    },
  );

  ipcMain.handle("window:notifyPreviewUrl", (_, url: string) => {
    const previewWin = detachedWindows.get("preview");
    if (previewWin && !previewWin.isDestroyed()) {
      previewWin.webContents.send("window:previewUrlUpdated", { url });
    }
  });

  ipcMain.handle("dialog:openFile", async () => {
    const result = await dialog.showOpenDialog(win, {
      filters: [{ name: "Word Documents", extensions: ["docx"] }],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const buffer = await readFile(filePath);
    const name = filePath.split(/[\\/]/).pop() ?? "document.docx";
    return { filePath, buffer: new Uint8Array(buffer), name };
  });

  ipcMain.handle("dialog:saveFile", async (_, defaultName: string) => {
    const ext = defaultName.split(".").pop() ?? "";
    const filterMap: Record<string, { name: string; extensions: string[] }> = {
      html: { name: "HTML Files", extensions: ["html"] },
      md: { name: "Markdown Files", extensions: ["md"] },
      zip: { name: "ZIP Archives", extensions: ["zip"] },
    };
    const filter = filterMap[ext] ?? { name: "All Files", extensions: ["*"] };
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [filter, { name: "All Files", extensions: ["*"] }],
    });
    return result.canceled ? null : (result.filePath ?? null);
  });

  ipcMain.handle(
    "file:write",
    async (_, filePath: string, buffer: Uint8Array) => {
      await writeFile(filePath, Buffer.from(buffer));
    },
  );

  ipcMain.handle("file:watch", async (_, filePath: string) => {
    watchFile(filePath, async (changedPath) => {
      try {
        const buffer = await readFile(changedPath);
        const name = changedPath.split(/[\\/]/).pop() ?? "document.docx";
        win.webContents.send("file:changed", {
          filePath: changedPath,
          buffer: new Uint8Array(buffer),
          name,
        });
      } catch {
        // ignore read errors (file temporarily locked during save)
      }
    });
  });

  ipcMain.handle("file:unwatch", () => {
    unwatchFile();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
