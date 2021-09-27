import { unlinkSync } from "@aradzie/fsx";
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

export function track(file: string): void {
  locks.add(file);
}

export function untrack(file: string): void {
  locks.delete(file);
}
