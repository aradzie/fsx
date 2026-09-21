import { dirname } from "node:path";
import {
  close,
  closeSync,
  constants,
  futimes,
  futimesSync,
  mkdir,
  mkdirSync,
  open,
  openSync,
  utimes,
  utimesSync,
} from "./fs.js";

/**
 * Options for touching a file.
 */
export interface TouchOptions {
  /**
   * Whether to create the file if it does not exist. Defaults to true.
   */
  readonly create?: boolean;
  /**
   * The value to use for the file's access and modification times.
   * Defaults to the current time.
   */
  readonly now?: Date;
}

/**
 * Updates the access and modification times of the specified file.
 * Creates an empty file if it does not exist, unless `create` is false.
 *
 * @param name The path to the file to touch.
 * @param options Options for touching the file.
 * @return Whether the file's timestamps were updated or an empty file was created.
 */
export async function touch(
  name: string,
  options: TouchOptions = {},
): Promise<boolean> {
  const { create = true, now = new Date() } = options;
  try {
    await utimes(name, now, now);
    return true;
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    if (!create) {
      return false;
    }
  }
  try {
    await mkdir(dirname(name), { recursive: true });
    const fd = await open(name, constants.O_WRONLY | constants.O_CREAT);
    try {
      await futimes(fd, now, now);
    } finally {
      await close(fd);
    }
    return true;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return false;
    } else {
      throw err;
    }
  }
}

/**
 * Updates the access and modification times of the specified file.
 * Creates an empty file if it does not exist, unless `create` is false.
 *
 * @param name The path to the file to touch.
 * @param options Options for touching the file.
 * @return Whether the file's timestamps were updated or an empty file was created.
 */
export function touchSync(name: string, options: TouchOptions = {}): boolean {
  const { create = true, now = new Date() } = options;
  try {
    utimesSync(name, now, now);
    return true;
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
    if (!create) {
      return false;
    }
  }
  try {
    mkdirSync(dirname(name), { recursive: true });
    const fd = openSync(name, constants.O_WRONLY | constants.O_CREAT);
    try {
      futimesSync(fd, now, now);
    } finally {
      closeSync(fd);
    }
    return true;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return false;
    } else {
      throw err;
    }
  }
}
