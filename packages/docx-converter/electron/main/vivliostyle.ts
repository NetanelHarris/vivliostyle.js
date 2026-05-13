import { ipcMain, BrowserWindow, app } from "electron";
import { spawn, ChildProcess } from "child_process";
import { join, resolve, dirname } from "path";
import { existsSync } from "fs";
import { createServer } from "net";

const CONFIG_NAMES = [
  "vivliostyle.config.js",
  "vivliostyle.config.mjs",
  "vivliostyle.config.cjs",
  "vivliostyle.config.ts",
  "vivliostyle.config.json",
];

function findConfigFile(projectDir: string): string | null {
  for (const name of CONFIG_NAMES) {
    const p = join(projectDir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function resolveCliPath(): string {
  // Node module resolution (works after electron-vite bundles to CJS)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkgPath = require.resolve("@vivliostyle/cli/package.json");
    return join(dirname(pkgPath), "dist", "cli.js");
  } catch {
    // Fall back: search well-known locations relative to app
    const candidates = [
      join(process.resourcesPath ?? "", "cli", "dist", "cli.js"),
      resolve(
        app.getAppPath(),
        "..",
        "node_modules",
        "@vivliostyle",
        "cli",
        "dist",
        "cli.js",
      ),
      resolve(
        __dirname,
        "..",
        "..",
        "..",
        "node_modules",
        "@vivliostyle",
        "cli",
        "dist",
        "cli.js",
      ),
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    throw new Error("Could not locate @vivliostyle/cli/dist/cli.js");
  }
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(start = 13000): Promise<number> {
  for (let p = start; p < start + 200; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error("No free port in range");
}

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const { Socket } = require("net") as typeof import("net");
    const sock = new Socket();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(500);
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
    sock.once("timeout", () => done(false));
    sock.connect(port, "127.0.0.1");
  });
}

async function waitForPort(
  port: number,
  timeoutMs: number,
  abort: () => boolean,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (abort()) return false;
    if (await isPortListening(port)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

interface PreviewState {
  process: ChildProcess;
  port: number;
  projectDir: string;
}

let preview: PreviewState | null = null;

async function stopPreview(): Promise<void> {
  if (!preview) return;
  const proc = preview.process;
  preview = null;
  try {
    proc.kill();
  } catch {
    // ignore
  }
  // Give it a moment to release the port
  await new Promise((r) => setTimeout(r, 200));
}

export function registerVivliostyleHandlers(
  getWin: () => BrowserWindow | null,
): void {
  ipcMain.handle(
    "viv:preview:start",
    async (_, projectDir: string): Promise<{ port: number; url: string }> => {
      if (preview && preview.projectDir === projectDir) {
        return { port: preview.port, url: `http://localhost:${preview.port}` };
      }
      await stopPreview();

      const cliPath = resolveCliPath();
      const port = await findAvailablePort();
      const configPath = findConfigFile(projectDir);

      const args = [cliPath, "preview"];
      if (configPath) {
        args.push("-c", configPath);
      } else {
        // No config — fall back to passing the directory as input. The CLI will look
        // for HTML/MD entries or throw a clearer error.
        args.push(projectDir);
      }
      args.push(
        "--port",
        String(port),
        "--host",
        "127.0.0.1",
        "--no-open-viewer",
        "--log-level",
        "verbose",
      );

      console.log("[viv] spawn:", process.execPath, args.join(" "));
      console.log("[viv] cwd:", projectDir);

      // stdin must be 'pipe' (not 'ignore'): the CLI attaches a readline interface
      // to stdin to detect Ctrl+C, and a closed stdin causes it to shut down
      // immediately as if the user pressed Ctrl+C.
      const child = spawn(process.execPath, args, {
        cwd: projectDir,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      });

      const send = (channel: string, payload: unknown) => {
        const win = getWin();
        win?.webContents.send(channel, payload);
      };

      let exited = false;
      let viewerUrl: string | null = null;
      const recentOutput: string[] = [];
      const captureRecent = (text: string) => {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const l of lines) {
          recentOutput.push(l);
          if (recentOutput.length > 20) recentOutput.shift();
        }
      };
      child.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        captureRecent(text);
        process.stdout.write(`[viv stdout] ${text}`);
        send("viv:log", { stream: "stdout", text });
        // Look for "Preview URL: <url>" — the CLI emits the full viewer URL.
        if (!viewerUrl) {
          const m = text.match(/Preview URL:\s*(\S+)/);
          if (m) viewerUrl = m[1];
        }
      });
      child.stderr?.on("data", (chunk) => {
        const text = chunk.toString();
        captureRecent(text);
        process.stderr.write(`[viv stderr] ${text}`);
        send("viv:log", { stream: "stderr", text });
      });
      child.on("exit", (code) => {
        exited = true;
        console.log("[viv] preview exited with code", code);
        send("viv:preview:exit", { code });
        if (preview?.process === child) preview = null;
      });
      child.on("error", (err) => {
        console.error("[viv] spawn error:", err);
        send("viv:log", {
          stream: "stderr",
          text: `[spawn error] ${err.message}\n`,
        });
      });

      preview = { process: child, port, projectDir };

      const ready = await waitForPort(port, 30000, () => exited);
      if (!ready) {
        const tail = recentOutput.slice(-5).join("\n");
        if (exited) {
          throw new Error(
            `vivliostyle preview exited before the server started.\n${tail}`,
          );
        }
        throw new Error(
          `vivliostyle preview did not start listening on port ${port} within 30s.\n${tail}`,
        );
      }
      // Give the CLI a moment to print the "Preview URL: ..." line.
      for (let i = 0; i < 20 && !viewerUrl; i++) {
        await new Promise((r) => setTimeout(r, 150));
      }
      const finalUrl =
        viewerUrl ?? `http://localhost:${port}/__vivliostyle-viewer/index.html`;
      return { port, url: finalUrl };
    },
  );

  ipcMain.handle("viv:preview:stop", async () => {
    await stopPreview();
  });

  ipcMain.handle("viv:preview:status", async () => {
    if (!preview) return null;
    return {
      port: preview.port,
      url: `http://localhost:${preview.port}`,
      projectDir: preview.projectDir,
    };
  });

  ipcMain.handle(
    "viv:build",
    async (
      _,
      projectDir: string,
      output: string,
      extraArgs: string[] = [],
    ): Promise<{ code: number | null; error?: string }> => {
      const cliPath = resolveCliPath();
      const configPath = findConfigFile(projectDir);

      const args = [cliPath, "build"];
      if (configPath) {
        args.push("-c", configPath);
      } else {
        args.push(projectDir);
      }
      args.push("-o", output, ...extraArgs);

      console.log("[viv build] spawn:", process.execPath, args.join(" "));
      // build doesn't need readline-on-stdin like preview, but using 'pipe' is
      // safe and consistent.
      const child = spawn(process.execPath, args, {
        cwd: projectDir,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      });

      const send = (channel: string, payload: unknown) => {
        const win = getWin();
        win?.webContents.send(channel, payload);
      };

      const recent: string[] = [];
      const captureRecent = (text: string) => {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const l of lines) {
          recent.push(l);
          if (recent.length > 30) recent.shift();
        }
      };

      child.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        captureRecent(text);
        process.stdout.write(`[viv build stdout] ${text}`);
        send("viv:log", { stream: "stdout", text });
      });
      child.stderr?.on("data", (chunk) => {
        const text = chunk.toString();
        captureRecent(text);
        process.stderr.write(`[viv build stderr] ${text}`);
        send("viv:log", { stream: "stderr", text });
      });

      return new Promise((resolve) => {
        child.on("exit", (code) => {
          if (code === 0) {
            resolve({ code });
          } else {
            const tail = recent.slice(-5).join("\n");
            resolve({ code, error: tail });
          }
        });
        child.on("error", (err) => {
          resolve({ code: -1, error: err.message });
        });
      });
    },
  );

  app.on("before-quit", () => {
    void stopPreview();
  });
}
