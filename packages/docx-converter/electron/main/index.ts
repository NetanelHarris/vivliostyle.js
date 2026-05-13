import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import { watchFile, unwatchFile } from "./file-watcher.js";
import { registerFsHandlers } from "./fs-handlers.js";
import { registerVivliostyleHandlers } from "./vivliostyle.js";
import { registerConfigCodecHandlers } from "./config-codec.js";

let mainWindow: BrowserWindow | null = null;

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
