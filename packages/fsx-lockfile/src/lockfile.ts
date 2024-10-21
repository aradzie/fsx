import { realpath, rename, unlink } from "@sosimple/fsx";
import { Encoding, File, FileHandle } from "@sosimple/fsx-file";
import { Retry, RetryOptions } from "@sosimple/retry";
import assert from "assert";
import { resolve } from "path";
import { track, untrack } from "./cleanup.js";
import { debuglog } from "./debug.js";
import { expandPathTemplate } from "./path.js";

/**
 * An error which indicates failure to lock a file.
 */
export class LockFileError extends Error {
  /**
   * The lock file path.
   */
  readonly path: string;
  /**
   * The number of attempts made before giving up.
   */
  readonly attempts: number;
  /**
   * The elapsed time before giving up.
   */
  readonly elapsed: number;

  constructor({
    path,
    attempts,
    elapsed,
  }: {
    readonly path: string;
    readonly attempts: number;
    readonly elapsed: number;
  }) {
    super(
      `Unable to lock file: "${path}", ` +
        `attempts made: ${attempts}, ` +
        `elapsed time: ${elapsed}ms`,
    );
    this.name = "LockFileError";
    this.path = path;
    this.attempts = attempts;
    this.elapsed = elapsed;
  }
}

/**
 * Lock file options.
 */
export interface LockFileOptions {
  /**
   * The number of millis after which a file is considered stale.
   * The default value is one hour.
   */
  readonly staleAfter?: number;
  /**
   * The lock file name.
   *
   * Is a template which accepts placeholders, such as:
   *
   * - `[path]` -- The original file path.
   * - `[root]` -- `root` from `parse(path)`.
   * - `[dir]` -- `dir` from `parse(path)`.
   * - `[base]` -- `base` from `parse(path)`.
   * - `[name]` -- `name` from `parse(path)`.
   * - `[ext]` -- `ext` from `parse(path)`.
   * - `[hash]` -- Hashed content of the original file path.
   * - `[slug]` -- The original file path in which
   *               all `"/"` are replaced with `"~"`.
   *
   * Examples for the original file name `"/var/lib/my-file.txt"`:
   *
   * - `"[path]"`                     => `"/var/lib/my-file.txt"`
   * - `"[path].lock"`                => `"/var/lib/my-file.txt.lock"`
   * - `"/run/lock/[base]"`           => `"/run/lock/my-file.txt"`
   * - `"/run/lock/[base].lock"`      => `"/run/lock/my-file.txt.lock"`
   * - `"/run/lock/[name][ext].lock"` => `"/run/lock/my-file.txt.lock"`
   * - `"/run/lock/[name]-lock[ext]"` => `"/run/lock/my-file-lock.txt"`
   * - `"/run/lock/[hash]"`           => `"/run/lock/49f30f4f6f29dac946c10832cd87cf3f"`
   * - `"/run/lock/[slug]"`           => `"/run/lock/~var~lib~my-file.txt"`
   *
   * The default value is `[path].lock`.
   */
  readonly lockName?: string;
}

export enum LockFileState {
  LOCKED,
  ABORTED,
  COMMITTED,
}

const kState = Symbol();

/**
 * Synchronizes access to a shared file for multiple concurrent processes.
 */
export class LockFile {
  /**
   * Executes the given callback function after locking the given file.
   * Throws [[LockFileError]] if file cannot be locked.
   *
   * @param name Name of the file to lock.
   * @param options Lock file options.
   * @param callback A callback to executes once the file is locked.
   * @return The result of the callback.
   */
  static async withLock<T>(
    name: File | string,
    options: LockFileOptions & RetryOptions,
    callback: (lock: LockFile) => Promise<T>,
  ): Promise<T> {
    const lock = await LockFile.lock(name, options);
    let result: T;
    try {
      result = await callback(lock);
    } catch (err: any) {
      if (lock.state === LockFileState.LOCKED) {
        await lock.rollback();
      }
      throw err;
    }
    if (lock.state === LockFileState.LOCKED) {
      await lock.commit();
    }
    return result;
  }

  /**
   * Attempts to lock the given file.
   * Throws [[LockFileError]] if file cannot be locked.
   *
   * @param name Name of the file to lock.
   * @param options Lock file options.
   * @return A promise which resolves with [[LockFile]] instance on success.
   */
  static async lock(
    name: File | string,
    options: LockFileOptions & RetryOptions,
  ): Promise<LockFile> {
    const opts = expand(options);
    const file = File.from(name);
    const lock = await lockName(file.name, opts.lockName);
    const retry = new Retry(options);
    while (true) {
      const handle = await tryOpenLock(lock);
      if (handle != null) {
        return new LockFile(file, handle);
      }
      if ((await LockFile.isLocked(name, options)) === "stale") {
        await lock.delete();
      } else {
        debuglog(
          `Failed to lock file "%s", ` +
            `attempts made: %d, ` +
            `elapsed time: %dms`,
          file,
          retry.attempts,
          retry.elapsed,
        );
        if (!(await retry.tryAgain())) {
          break;
        }
      }
    }
    throw new LockFileError({
      path: file.name,
      attempts: retry.attempts,
      elapsed: retry.elapsed,
    });
  }

  /**
   * Checks if the given file is locked.
   *
   * @param name Name of the file to check.
   * @param options Lock file options.
   * @return Lock status, one of `"unlocked"` `"locked"` or `"stale"`.
   */
  static async isLocked(
    name: File | string,
    options: LockFileOptions = {},
  ): Promise<"unlocked" | "locked" | "stale"> {
    const opts = expand(options);
    const file = File.from(name);
    const lock = await lockName(file.name, opts.lockName);
    try {
      const { mtime } = await lock.stat();
      if (mtime < new Date(Date.now() - opts.staleAfter)) {
        return "stale";
      } else {
        return "locked";
      }
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return "unlocked";
      } else {
        throw err;
      }
    }
  }

  static async forceUnlock(
    name: File | string,
    options: LockFileOptions = {},
  ): Promise<void> {
    const opts = expand(options);
    const file = File.from(name);
    const lock = await lockName(file.name, opts.lockName);
    await lock.delete();
  }

  private [kState] = LockFileState.LOCKED;

  constructor(
    public readonly file: File,
    public readonly lock: FileHandle,
  ) {
    track(this.lock.name);
  }

  get state(): LockFileState {
    return this[kState];
  }

  /**
   * Asynchronously writes the given contents to this lock file,
   * replacing any old contents.
   *
   * It is unsafe to call `writeFile()` multiple times on the same file without
   * waiting for the `Promise` to be resolved (or rejected).
   */
  async writeFile(
    data: NodeJS.ArrayBufferView | string,
    encoding?: Encoding,
  ): Promise<void> {
    assert(this[kState] === LockFileState.LOCKED);
    return this.lock.writeFile(data as any, encoding);
  }

  /**
   * Asynchronously append the given contents to this lock file.
   *
   * It is unsafe to call `appendFile()` multiple times on the same file without
   * waiting for the `Promise` to be resolved (or rejected).
   */
  async appendFile(
    data: NodeJS.ArrayBufferView | string,
    encoding?: Encoding,
  ): Promise<void> {
    assert(this[kState] === LockFileState.LOCKED);
    return this.lock.appendFile(data as any, encoding);
  }

  async rollback(): Promise<void> {
    assert(this[kState] === LockFileState.LOCKED);
    this[kState] = LockFileState.ABORTED;
    untrack(this.lock.name);
    await this.lock.close();
    await unlink(this.lock.name);
  }

  async commit(): Promise<void> {
    assert(this[kState] === LockFileState.LOCKED);
    this[kState] = LockFileState.COMMITTED;
    untrack(this.lock.name);
    await this.lock.close();
    try {
      await rename(this.lock.name, this.file.name);
    } catch (err) {
      await unlink(this.lock.name);
      throw err;
    }
  }

  get [Symbol.toStringTag](): string {
    return "LockFile";
  }
}

function expand(options: LockFileOptions) {
  return {
    staleAfter: 3_600_000, // One hour.
    lockName: "[path].lock",
    ...options,
  };
}

async function lockName(name: string, lockName: string): Promise<File> {
  try {
    name = await realpath(name);
  } catch {
    name = resolve(name);
  }
  lockName = expandPathTemplate(lockName, name);
  if (name === lockName) {
    throw new Error(`Lock name is the same as file name.`);
  }
  return new File(lockName);
}

async function tryOpenLock(file: File): Promise<FileHandle | null> {
  await file.dir().create();
  try {
    return await file.open("wx");
  } catch (err: any) {
    if (err.code === "EEXIST") {
      return null;
    } else {
      throw err;
    }
  }
}
