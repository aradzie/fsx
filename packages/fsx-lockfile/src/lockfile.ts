import { realpath, rename, unlink } from "@aradzie/fsx";
import { Encoding, File, FileHandle } from "@aradzie/fsx-file";
import { Retry, RetryOptions } from "@aradzie/retry";
import assert from "assert";
import { resolve } from "path";
import { track, untrack } from "./cleanup.js";
import { debuglog } from "./debug.js";

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
   * The lock file suffix.
   * The default value is `.lock`.
   */
  readonly suffix?: string;
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
    const lock = await lockName(file.name, opts.suffix);
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
    const lock = await lockName(file.name, opts.suffix);
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
    const lock = await lockName(file.name, opts.suffix);
    await lock.delete();
  }

  private [kState] = LockFileState.LOCKED;

  constructor(public readonly file: File, public readonly lock: FileHandle) {
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function expand(options: LockFileOptions) {
  return {
    staleAfter: 3_600_000, // One hour.
    suffix: ".lock",
    ...options,
  };
}

async function lockName(name: string, suffix: string): Promise<File> {
  try {
    name = await realpath(name);
  } catch {
    name = resolve(name);
  }
  return new File(name + suffix);
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
