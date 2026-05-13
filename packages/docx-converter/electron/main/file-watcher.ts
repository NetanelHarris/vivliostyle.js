import chokidar from "chokidar";

let watcher: chokidar.FSWatcher | null = null;

export function watchFile(
  filePath: string,
  onChange: (path: string) => void,
): void {
  if (watcher) watcher.close();
  watcher = chokidar.watch(filePath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });
  watcher.on("change", onChange);
}

export function unwatchFile(): void {
  watcher?.close();
  watcher = null;
}
