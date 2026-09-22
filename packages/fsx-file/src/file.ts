import { dirname, normalize, resolve } from "node:path";
import type {
  ReadStream,
  Stats,
  TouchOptions,
  WriteStream,
} from "@sosimple/fsx";
import {
  access,
  appendFile,
  constants,
  createReadStream,
  createWriteStream,
  emptyDir,
  mkdir,
  readFile,
  removeDir,
  rmdir,
  stat,
  touch,
  unlink,
  utimes,
  writeFile,
} from "@sosimple/fsx";
import { FileHandle } from "./filehandle.js";
import type {
  AppendOptions,
  Encoding,
  ReadJsonOptions,
  ReadOptions,
  WriteJsonOptions,
  WriteOptions,
} from "./types.js";

abstract class Entry {
  public readonly path: string;

  protected constructor(path: string) {
    this.path = normalize(resolve(path));
  }

  async stat(): Promise<Stats> {
    return stat(this.path);
  }

  async utimes(
    atime: string | number | Date,
    mtime: string | number | Date,
  ): Promise<void> {
    return utimes(this.path, atime, mtime);
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.path, constants.F_OK);
      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return false;
      } else {
        throw err;
      }
    }
  }

  async readable(): Promise<boolean> {
    try {
      await access(this.path, constants.R_OK);
      return true;
    } catch (err: any) {
      if (err.code === "EACCES") {
        return false;
      } else {
        throw err;
      }
    }
  }

  async writable(): Promise<boolean> {
    try {
      await access(this.path, constants.W_OK);
      return true;
    } catch (err: any) {
      if (err.code === "EACCES") {
        return false;
      } else {
        throw err;
      }
    }
  }

  abstract delete(): Promise<boolean>;

  toString(): string {
    return this.path;
  }
}

export class Dir extends Entry {
  constructor(path: string) {
    super(path);
  }

  async create(recursive = true): Promise<void> {
    await mkdir(this.path, { recursive });
  }

  /**
   * Deletes an empty directory, returning false if it does not exist.
   * Throws if the directory is not empty; use remove() for recursive deletion.
   */
  override async delete(): Promise<boolean> {
    try {
      await rmdir(this.path);
      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return false;
      }
      throw err;
    }
  }

  async empty(): Promise<void> {
    await emptyDir(this.path);
  }

  async remove(): Promise<void> {
    await removeDir(this.path);
  }

  get [Symbol.toStringTag](): string {
    return "Dir";
  }
}

export class File extends Entry {
  static from(file: string | File): File {
    if (file instanceof File) {
      return file;
    } else {
      return new File(file);
    }
  }

  constructor(path: string) {
    super(path);
  }

  dir(): Dir {
    return new Dir(dirname(this.path));
  }

  /**
   * Deletes the file, returning false if it does not exist.
   */
  override async delete(): Promise<boolean> {
    try {
      await unlink(this.path);
      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return false;
      }
      throw err;
    }
  }

  readStream(options?: ReadOptions | Encoding): ReadStream {
    if (options != null && typeof options === "object") {
      const { flag, ...rest } = options;
      return createReadStream(this.path, { ...rest, flags: flag });
    }
    return createReadStream(this.path, options);
  }

  writeStream(options?: WriteOptions | Encoding): WriteStream {
    if (options != null && typeof options === "object") {
      const { flag, ...rest } = options;
      return createWriteStream(this.path, { ...rest, flags: flag });
    }
    return createWriteStream(this.path, options);
  }

  open(
    flags: string | number,
    mode?: string | number | null,
  ): Promise<FileHandle> {
    return FileHandle.open(this.path, flags, mode);
  }

  read(): Promise<Buffer>;
  read(options: Encoding): Promise<string>;
  read(options?: ReadOptions | Encoding): Promise<Buffer | string>;
  read(options?: ReadOptions | Encoding): Promise<Buffer | string> {
    return readFile(this.path, options);
  }

  async write(data: any, options?: WriteOptions | Encoding): Promise<boolean> {
    await this.dir().create();
    try {
      await writeFile(this.path, data, options);
      return true;
    } catch (err: any) {
      if (err.code === "EEXIST") {
        return false;
      } else {
        throw err;
      }
    }
  }

  async append(
    data: any,
    options?: AppendOptions | Encoding,
  ): Promise<boolean> {
    await this.dir().create();
    try {
      await appendFile(this.path, data, options);
      return true;
    } catch (err: any) {
      if (err.code === "EEXIST") {
        return false;
      } else {
        throw err;
      }
    }
  }

  async readJson(
    options?: ReadJsonOptions | Encoding,
    reviver?: (key: any, value: any) => any,
  ): Promise<unknown> {
    if (options != null && typeof options === "object") {
      reviver = reviver ?? options.reviver;
    }
    return JSON.parse(String(await this.read(options)), reviver);
  }

  /**
   * Writes JSON, returning false if an exclusive write finds an existing file.
   */
  async writeJson(
    data: any,
    options?: WriteJsonOptions | Encoding,
    replacer?: (key: string, value: any) => any,
    space?: string | number,
  ): Promise<boolean> {
    if (options != null && typeof options === "object") {
      replacer = replacer ?? options.replacer;
      space = space ?? options.space;
    }
    return this.write(JSON.stringify(data, replacer, space), options);
  }

  async touch(options?: TouchOptions): Promise<boolean> {
    return touch(this.path, options);
  }

  get [Symbol.toStringTag](): string {
    return "File";
  }
}
