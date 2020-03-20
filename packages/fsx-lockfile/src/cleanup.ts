import { unlinkSync } from "@aradzie/fsx";
import { debuglog } from "./debug";

const locks = new Set<string>();

process.on("exit", cleanup);

function cleanup(): void {
  for (const lock of locks) {
    locks.delete(lock);
    debuglog(`Cleanup lock file "%s"`, lock);
    try {
      unlinkSync(lock);
    } catch (ex) {
      if (ex.code !== "ENOENT") {
        debuglog(`Lock file cleanup error: %o`, ex);
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
