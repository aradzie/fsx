import { join, parse, sep } from "node:path";
import type { Stats } from "./fs.js";
import {
  lstat,
  lstatSync,
  readdir,
  readdirSync,
  rmdir,
  rmdirSync,
  unlink,
  unlinkSync,
} from "./fs.js";

export interface Entry {
  /**
   * The path to this entry, relative to the directory being scanned.
   */
  readonly path: string;
  /**
   * Filesystem metadata for this entry.
   */
  readonly stats: Stats;
}

/**
 * Recursively traverses the contents of the given directory in pre-order.
 * The directory itself is excluded.
 * Symlink entries are not followed; a symlink root is rejected.
 * Traversal is not atomic with respect to concurrent filesystem changes.
 * @param dir The directory to scan.
 * @return An iterable of entries in the directory.
 */
export async function* scanDir(dir: string): AsyncIterable<Entry> {
  checkRoot(dir, await safeLstat(rootPath(dir)));
  for (const item of await safeReaddir(dir)) {
    yield* scan(dir, item);
  }
}

async function* scan(dir: string, suffix: string): AsyncIterable<Entry> {
  const path = join(dir, suffix);
  const stats = await safeLstat(path);
  if (stats != null) {
    yield { path: suffix, stats };
    // The consumer may have replaced the directory while iteration was paused.
    if (stats.isDirectory() && (await safeLstat(path))?.isDirectory()) {
      for (const item of await safeReaddir(path)) {
        yield* scan(dir, join(suffix, item));
      }
    }
  }
}

/**
 * Recursively traverses the contents of the given directory in pre-order.
 * The directory itself is excluded.
 * Symlink entries are not followed; a symlink root is rejected.
 * Traversal is not atomic with respect to concurrent filesystem changes.
 * @param dir The directory to scan.
 * @return An iterable of entries in the directory.
 */
export function* scanDirSync(dir: string): Iterable<Entry> {
  checkRoot(dir, safeLstatSync(rootPath(dir)));
  for (const item of safeReaddirSync(dir)) {
    yield* scanSync(dir, item);
  }
}

function* scanSync(dir: string, suffix: string): Iterable<Entry> {
  const path = join(dir, suffix);
  const stats = safeLstatSync(path);
  if (stats != null) {
    yield { path: suffix, stats };
    // The consumer may have replaced the directory while iteration was paused.
    if (stats.isDirectory() && safeLstatSync(path)?.isDirectory()) {
      for (const item of safeReaddirSync(path)) {
        yield* scanSync(dir, join(suffix, item));
      }
    }
  }
}

/**
 * Recursively removes all contents from the given directory. The directory
 * itself is not removed.
 * If the directory does not exist, this function does nothing.
 * Symlink roots are rejected; symlink entries are unlinked without following them.
 * @param dir The directory to empty.
 */
export async function emptyDir(dir: string): Promise<void> {
  for await (const entry of start(dir)) {
    await kill(entry);
  }
}

/**
 * Recursively removes all contents from the given directory. The directory
 * itself is not removed.
 * If the directory does not exist, this function does nothing.
 * Symlink roots are rejected; symlink entries are unlinked without following them.
 * @param dir The directory to empty.
 */
export function emptyDirSync(dir: string): void {
  for (const entry of startSync(dir)) {
    killSync(entry);
  }
}

/**
 * Recursively removes the given directory and all its contents.
 * If the directory does not exist, this function does nothing.
 * Symlink roots are rejected; symlink entries are unlinked without following them.
 * @param dir The directory to remove.
 */
export async function removeDir(dir: string): Promise<void> {
  for await (const entry of start(dir)) {
    await kill(entry);
  }
  try {
    await rmdir(dir);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}

/**
 * Recursively removes the given directory and all its contents.
 * If the directory does not exist, this function does nothing.
 * Symlink roots are rejected; symlink entries are unlinked without following them.
 * @param dir The directory to remove.
 */
export function removeDirSync(dir: string): void {
  for (const entry of startSync(dir)) {
    killSync(entry);
  }
  try {
    rmdirSync(dir);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}

async function* start(dir: string): AsyncIterable<Entry> {
  checkRoot(dir, await safeLstat(rootPath(dir)));
  for (const item of await safeReaddir(dir)) {
    yield* postOrderScan(join(dir, item));
  }
}

function* startSync(dir: string): Iterable<Entry> {
  checkRoot(dir, safeLstatSync(rootPath(dir)));
  for (const item of safeReaddirSync(dir)) {
    yield* postOrderScanSync(join(dir, item));
  }
}

/**
 * Performs recursive post-order traversal of directory contents.
 */
async function* postOrderScan(dir: string): AsyncIterable<Entry> {
  const stats = await safeLstat(dir);
  if (stats != null) {
    if (stats.isDirectory()) {
      for (const item of await safeReaddir(dir)) {
        yield* postOrderScan(join(dir, item));
      }
    }
    yield { path: dir, stats };
  }
}

/**
 * Performs recursive post-order traversal of directory contents.
 */
function* postOrderScanSync(dir: string): Iterable<Entry> {
  const stats = safeLstatSync(dir);
  if (stats != null) {
    if (stats.isDirectory()) {
      for (const item of safeReaddirSync(dir)) {
        yield* postOrderScanSync(join(dir, item));
      }
    }
    yield { path: dir, stats };
  }
}

/**
 * Deletes a filesystem entry, whether it is a directory, file, or symlink.
 */
async function kill({ path, stats }: Entry): Promise<void> {
  try {
    if (stats.isDirectory()) {
      await rmdir(path);
    } else {
      await unlink(path);
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}

/**
 * Deletes a filesystem entry, whether it is a directory, file, or symlink.
 */
function killSync({ path, stats }: Entry): void {
  try {
    if (stats.isDirectory()) {
      rmdirSync(path);
    } else {
      unlinkSync(path);
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}

async function safeReaddir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return [];
    } else {
      throw err;
    }
  }
}

function safeReaddirSync(path: string): string[] {
  try {
    return readdirSync(path);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return [];
    } else {
      throw err;
    }
  }
}

async function safeLstat(path: string): Promise<Stats | null> {
  try {
    return await lstat(path);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return null;
    } else {
      throw err;
    }
  }
}

function safeLstatSync(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return null;
    } else {
      throw err;
    }
  }
}

// Remove trailing separators so lstat inspects the root symlink itself.
function rootPath(dir: string): string {
  const rootLength = parse(dir).root.length;
  while (dir.length > rootLength && dir.endsWith(sep)) {
    dir = dir.slice(0, -1);
  }
  return dir;
}

function checkRoot(path: string, stats: Stats | null): void {
  if (stats != null && !stats.isDirectory()) {
    throw Object.assign(new Error(`Not a directory: ${path}`), {
      code: "ENOTDIR",
      path,
    });
  }
}
