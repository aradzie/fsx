import { dirname } from "path";
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
} from "./fs.js";

/**
 * Touch options.
 */
export interface TouchOptions {
  /**
   * Whether to create a new file if it does not exist.
   */
  readonly create?: boolean;
  /**
   * Set the file modification time to this value.
   */
  readonly now?: Date;
}

/**
 * Updates the modification time the specified file.
 * If the file does not exist, a new empty one will be created.
 *
 * @param name Name of the file to touch.
 * @param options Touch options.
 * @return A boolean value indicating whether the modification time
 *         of the existing file was updated or a new empty file was created.
 */
export async function touch(
  name: string,
  options: TouchOptions = {},
): Promise<boolean> {
  const { create = true, now = new Date() } = options;
  let flags = constants.O_RDWR;
  if (create) {
    flags = flags | constants.O_CREAT;
  }
  try {
    if (create) {
      await mkdir(dirname(name), { recursive: true });
    }
    const fd = await open(name, flags);
    await futimes(fd, now, now);
    await close(fd);
    return true;
  } catch (ex) {
    if (ex.code === "ENOENT") {
      return false;
    } else {
      throw ex;
    }
  }
}

/**
 * Updates the modification time the specified file.
 * If the file does not exist, a new empty one will be created.
 *
 * @param name Name of the file to touch.
 * @param options Touch options.
 * @return A boolean value indicating whether the modification time
 *         of the existing file was updated or a new empty file was created.
 */
export function touchSync(name: string, options: TouchOptions = {}): boolean {
  const { create = true, now = new Date() } = options;
  let flags = constants.O_RDWR;
  if (create) {
    flags = flags | constants.O_CREAT;
  }
  try {
    if (create) {
      mkdirSync(dirname(name), { recursive: true });
    }
    const fd = openSync(name, flags);
    futimesSync(fd, now, now);
    closeSync(fd);
    return true;
  } catch (ex) {
    if (ex.code === "ENOENT") {
      return false;
    } else {
      throw ex;
    }
  }
}
