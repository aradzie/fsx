import { unlinkSync } from "@sosimple/fsx";
import { debuglog } from "./debug.js";

const locks = new Set<string>();

process.on("exit", cleanup);

function cleanup(): void {
  for (const lock of locks) {
    locks.delete(lock);
    debuglog(`Cleanup lock file "%s"`, lock);
    try {
      unlinkSync(lock);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        debuglog(`Lock file cleanup error: %o`, err);
      }
    }
  }
}

export function track(path: string): void {
  locks.add(path);
}

export function untrack(path: string): void {
  locks.delete(path);
}
