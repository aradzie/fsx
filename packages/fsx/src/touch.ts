import {
  close,
  closeSync,
  constants,
  futimes,
  futimesSync,
  open,
  openSync,
} from "./fs";

export interface TouchOptions {
  readonly create?: boolean;
  readonly now?: Date;
}

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

export async function touchSync(
  name: string,
  options: TouchOptions = {},
): Promise<boolean> {
  const { create = true, now = new Date() } = options;
  let flags = constants.O_RDWR;
  if (create) {
    flags = flags | constants.O_CREAT;
  }
  try {
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
