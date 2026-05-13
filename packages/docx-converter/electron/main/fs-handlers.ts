import { ipcMain, dialog, BrowserWindow } from "electron";
import {
  readdir,
  readFile,
  writeFile,
  stat,
  mkdir,
  rename,
  unlink,
} from "fs/promises";
import { join, relative, sep } from "path";
import chokidar from "chokidar";

export interface FileTreeNode {
  name: string;
  path: string; // absolute
  relativePath: string; // relative to project root, using forward slashes
  isDirectory: boolean;
  children?: FileTreeNode[];
}

const HIDDEN_DIRS = new Set([".vivliostyle", "node_modules", ".git"]);

async function readTree(
  absPath: string,
  rootPath: string,
): Promise<FileTreeNode> {
  const s = await stat(absPath);
  const name = absPath.split(/[\\/]/).pop() ?? absPath;
  const rel = relative(rootPath, absPath).split(sep).join("/");
  const node: FileTreeNode = {
    name,
    path: absPath,
    relativePath: rel,
    isDirectory: s.isDirectory(),
  };
  if (s.isDirectory()) {
    const entries = await readdir(absPath);
    const children: FileTreeNode[] = [];
    for (const entry of entries) {
      if (HIDDEN_DIRS.has(entry)) continue;
      children.push(await readTree(join(absPath, entry), rootPath));
    }
    children.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children = children;
  }
  return node;
}

let dirWatcher: chokidar.FSWatcher | null = null;

export function registerFsHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle(
    "dialog:saveAs",
    async (
      _,
      options: {
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      },
    ): Promise<string | null> => {
      const win = getWin();
      const result = win
        ? await dialog.showSaveDialog(win, options)
        : await dialog.showSaveDialog(options);
      return result.canceled ? null : (result.filePath ?? null);
    },
  );

  ipcMain.handle("dialog:openDirectory", async () => {
    const win = getWin();
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ["openDirectory"] })
      : await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    "fs:readDir",
    async (_, dirPath: string): Promise<FileTreeNode> => {
      return readTree(dirPath, dirPath);
    },
  );

  ipcMain.handle(
    "fs:readFile",
    async (
      _,
      filePath: string,
      encoding?: BufferEncoding,
    ): Promise<string | Uint8Array> => {
      if (encoding) {
        return await readFile(filePath, encoding);
      }
      const buf = await readFile(filePath);
      return new Uint8Array(buf);
    },
  );

  ipcMain.handle(
    "fs:writeFile",
    async (_, filePath: string, content: string | Uint8Array) => {
      const data = typeof content === "string" ? content : Buffer.from(content);
      await writeFile(filePath, data);
    },
  );

  ipcMain.handle("fs:mkdir", async (_, dirPath: string) => {
    await mkdir(dirPath, { recursive: true });
  });

  ipcMain.handle("fs:rename", async (_, oldPath: string, newPath: string) => {
    await rename(oldPath, newPath);
  });

  ipcMain.handle("fs:delete", async (_, path: string) => {
    await unlink(path);
  });

  ipcMain.handle("fs:exists", async (_, path: string): Promise<boolean> => {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("fs:watchDir", async (_, dirPath: string) => {
    if (dirWatcher) {
      await dirWatcher.close();
      dirWatcher = null;
    }
    dirWatcher = chokidar.watch(dirPath, {
      ignored: (p) => {
        const parts = p.split(/[\\/]/);
        return parts.some((seg) => HIDDEN_DIRS.has(seg));
      },
      ignoreInitial: true,
      persistent: true,
    });
    const notify = () => {
      const win = getWin();
      if (!win) return;
      win.webContents.send("fs:dirChanged", { dirPath });
    };
    dirWatcher.on("add", notify);
    dirWatcher.on("unlink", notify);
    dirWatcher.on("addDir", notify);
    dirWatcher.on("unlinkDir", notify);
    dirWatcher.on("change", (changedPath) => {
      const win = getWin();
      if (!win) return;
      win.webContents.send("fs:fileChanged", { filePath: changedPath });
    });
  });

  ipcMain.handle("fs:unwatchDir", async () => {
    if (dirWatcher) {
      await dirWatcher.close();
      dirWatcher = null;
    }
  });
}
