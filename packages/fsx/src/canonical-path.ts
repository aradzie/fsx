import { basename, dirname, resolve } from "node:path";
import { realpath, realpathSync } from "./fs.js";

/**
 * Returns an absolute, normalized path after resolving symbolic links in its
 * longest existing prefix. The path itself does not need to exist.
 *
 * This function does not provide a stable filesystem identity. Hard links,
 * bind mounts, case aliases, and concurrent filesystem changes can still make
 * different paths refer to the same entry or change what a path refers to.
 *
 * @param path The path to canonicalize.
 * @return The canonicalized path.
 */
export async function canonicalPath(path: string): Promise<string> {
  const suffix: string[] = [];
  let prefix = resolve(path);

  while (true) {
    try {
      return resolve(await realpath(prefix), ...suffix);
    } catch (err: any) {
      if (err.code !== "ENOENT" && err.code !== "ENOTDIR") {
        throw err;
      }
      const parent = dirname(prefix);
      if (parent === prefix) {
        throw err;
      }
      suffix.unshift(basename(prefix));
      prefix = parent;
    }
  }
}

/**
 * Synchronously returns an absolute, normalized path after resolving symbolic
 * links in its longest existing prefix. The path itself does not need to
 * exist.
 *
 * This function does not provide a stable filesystem identity. Hard links,
 * bind mounts, case aliases, and concurrent filesystem changes can still make
 * different paths refer to the same entry or change what a path refers to.
 *
 * @param path The path to canonicalize.
 * @return The canonicalized path.
 */
export function canonicalPathSync(path: string): string {
  const suffix: string[] = [];
  let prefix = resolve(path);

  while (true) {
    try {
      return resolve(realpathSync(prefix), ...suffix);
    } catch (err: any) {
      if (err.code !== "ENOENT" && err.code !== "ENOTDIR") {
        throw err;
      }
      const parent = dirname(prefix);
      if (parent === prefix) {
        throw err;
      }
      suffix.unshift(basename(prefix));
      prefix = parent;
    }
  }
}
