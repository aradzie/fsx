import {
  access,
  appendFile,
  constants,
  createReadStream,
  createWriteStream,
  emptyDir,
  mkdir,
  readFile,
  ReadStream,
  removeDir,
  stat,
  Stats,
  touch,
  TouchOptions,
  unlink,
  utimes,
  writeFile,
  WriteStream,
} from "@aradzie/fsx";
import { dirname, normalize, resolve } from "path";

export type ReadFlag =
  | "r" // Open file for reading. An exception occurs if the file does not exist.
  | "r+"; // Open file for reading and writing. An exception occurs if the file does not exist.

export type AppendFlag =
  | "a" // Open file for appending. The file is created if it does not exist.
  | "ax" // Like 'a' but fails if the path exists.
  | "a+" // Open file for reading and appending. The file is created if it does not exist.
  | "ax+"; // Like 'a+' but fails if the path exists.

export type WriteFlag =
  | AppendFlag
  | "w" // Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
  | "wx" // Like 'w' but fails if the path exists.
  | "w+" // Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
  | "wx+"; // Like 'w+' but fails if the path exists.

export type Encoding = "utf8" | "base64" | "hex" | "binary";

export interface ReadOptions {
  readonly flag?: ReadFlag;
  readonly encoding?: Encoding;
}

export interface AppendOptions {
  readonly mode?: number;
  readonly flag?: AppendFlag;
  readonly encoding?: Encoding;
}

export interface WriteOptions {
  readonly mode?: number;
  readonly flag?: WriteFlag;
  readonly encoding?: Encoding;
}

export interface ReadJsonOptions extends ReadOptions {
  readonly reviver?: (key: any, value: any) => any;
}

export interface WriteJsonOptions extends WriteOptions {
  readonly replacer?: (key: string, value: any) => any;
  readonly space?: string | number;
}

abstract class Entry {
  public readonly name: string;

  protected constructor(path: string) {
    this.name = normalize(resolve(path));
  }

  async stat(): Promise<Stats> {
    return stat(this.name);
  }

  async utimes(
    atime: string | number | Date,
    mtime: string | number | Date,
  ): Promise<void> {
    return utimes(this.name, atime, mtime);
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.name, constants.F_OK);
      return true;
    } catch (ex) {
      if (ex.code === "ENOENT") {
        return false;
      } else {
        throw ex;
      }
    }
  }

  async readable(): Promise<boolean> {
    try {
      await access(this.name, constants.R_OK);
      return true;
    } catch (ex) {
      if (ex.code === "EACCES") {
        return false;
      } else {
        throw ex;
      }
    }
  }

  async writable(): Promise<boolean> {
    try {
      await access(this.name, constants.W_OK);
      return true;
    } catch (ex) {
      if (ex.code === "EACCES") {
        return false;
      } else {
        throw ex;
      }
    }
  }

  async delete(): Promise<boolean> {
    try {
      await unlink(this.name);
      return true;
    } catch (ex) {
      if (ex.code === "ENOENT") {
        return false;
      } else {
        throw ex;
      }
    }
  }

  toString(): string {
    return this.name;
  }
}

export class Dir extends Entry {
  constructor(path: string) {
    super(path);
  }

  async create(recursive = true): Promise<void> {
    await mkdir(this.name, { recursive });
  }

  async empty(): Promise<void> {
    await emptyDir(this.name);
  }

  async remove(): Promise<void> {
    await removeDir(this.name);
  }

  get [Symbol.toStringTag](): string {
    return "Dir";
  }
}

export class File extends Entry {
  static from(name: string | File): File {
    if (name instanceof File) {
      return name;
    } else {
      return new File(name);
    }
  }

  constructor(path: string) {
    super(path);
  }

  dir(): Dir {
    return new Dir(dirname(this.name));
  }

  readStream(options?: ReadOptions | Encoding): ReadStream {
    return createReadStream(this.name, options);
  }

  writeStream(options?: WriteOptions | Encoding): WriteStream {
    return createWriteStream(this.name, options);
  }

  async read(): Promise<Buffer>;
  async read(options: Encoding): Promise<string>;
  async read(options?: ReadOptions | Encoding): Promise<Buffer | string>;
  async read(options?: ReadOptions | Encoding): Promise<Buffer | string> {
    return await readFile(this.name, options);
  }

  async write(data: any, options?: WriteOptions | Encoding): Promise<boolean> {
    await this.dir().create();
    try {
      await writeFile(this.name, data, options);
      return true;
    } catch (ex) {
      if (ex.code === "EEXIST") {
        return false;
      } else {
        throw ex;
      }
    }
  }

  async append(
    data: any,
    options?: AppendOptions | Encoding,
  ): Promise<boolean> {
    await this.dir().create();
    try {
      await appendFile(this.name, data, options);
      return true;
    } catch (ex) {
      if (ex.code === "EEXIST") {
        return false;
      } else {
        throw ex;
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

  async writeJson(
    data: any,
    options?: WriteJsonOptions | Encoding,
    replacer?: (key: string, value: any) => any,
    space?: string | number,
  ): Promise<void> {
    if (options != null && typeof options === "object") {
      replacer = replacer ?? options.replacer;
      space = space ?? options.space;
    }
    await this.write(JSON.stringify(data, replacer, space), options);
  }

  async touch(options?: TouchOptions): Promise<boolean> {
    await this.dir().create();
    return await touch(this.name, options);
  }

  get [Symbol.toStringTag](): string {
    return "File";
  }
}
