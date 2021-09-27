import { join } from "path";
import {
  lstat,
  lstatSync,
  readdir,
  readdirSync,
  rmdir,
  rmdirSync,
  Stats,
  unlink,
  unlinkSync,
} from "./fs.js";

export interface Entry {
  /**
   * Path to this entry, relative to the input dir path.
   */
  readonly path: string;
  /**
   * Entry stats.
   */
  readonly stats: Stats;
}

/**
 * Performs recursive pre-order traversal of the given directory
 * for all its contents.
 * The directory itself is excluded.
 * Symlinks are not followed.
 * @param dir The directory to scan.
 * @return An iterator of all directory contents.
 */
export async function* scanDir(dir: string): AsyncIterable<Entry> {
  for (const item of await safeReaddir(dir)) {
    yield* scan(dir, item);
  }
}

async function* scan(dir: string, suffix: string): AsyncIterable<Entry> {
  const path = join(dir, suffix);
  const stats = await safeLstat(path);
  if (stats != null) {
    yield { path: suffix, stats };
    if (stats.isDirectory()) {
      for (const item of await safeReaddir(path)) {
        yield* scan(dir, join(suffix, item));
      }
    }
  }
}

/**
 * Performs recursive pre-order traversal of the given directory
 * for all its contents.
 * The directory itself is excluded.
 * Symlinks are not followed.
 * @param dir The directory to scan.
 * @return An iterator of all directory contents.
 */
export function* scanDirSync(dir: string): Iterable<Entry> {
  for (const item of safeReaddirSync(dir)) {
    yield* scanSync(dir, item);
  }
}

function* scanSync(dir: string, suffix: string): Iterable<Entry> {
  const path = join(dir, suffix);
  const stats = safeLstatSync(path);
  if (stats != null) {
    yield { path: suffix, stats };
    if (stats.isDirectory()) {
      for (const item of safeReaddirSync(path)) {
        yield* scanSync(dir, join(suffix, item));
      }
    }
  }
}

/**
 * Recursively removes all contents form the given directory. The directory
 * itself is not removed.
 * If the directory does not exist then this method does nothing.
 * @param dir The directory to empty.
 */
export async function emptyDir(dir: string): Promise<void> {
  for await (const entry of start(dir)) {
    await kill(entry);
  }
}

/**
 * Recursively removes all contents form the given directory. The directory
 * itself is not removed.
 * If the directory does not exist then this method does nothing.
 * @param dir The directory to empty.
 */
export function emptyDirSync(dir: string): void {
  for (const entry of startSync(dir)) {
    killSync(entry);
  }
}

/**
 * Recursively removes the given directory with all its content.
 * If the directory does not exist then this method does nothing.
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
 * Recursively removes the given directory with all its content.
 * If the directory does not exist then this method does nothing.
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
  for (const item of await safeReaddir(dir)) {
    yield* postOrderScan(join(dir, item));
  }
}

function* startSync(dir: string): Iterable<Entry> {
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
 * Deletes filesystem entry, directory or file.
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
 * Deletes filesystem entry, directory or file.
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
