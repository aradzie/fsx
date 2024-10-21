import { dirname, normalize, resolve } from "node:path";
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
      await access(this.name, constants.R_OK);
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
      await access(this.name, constants.W_OK);
      return true;
    } catch (err: any) {
      if (err.code === "EACCES") {
        return false;
      } else {
        throw err;
      }
    }
  }

  async delete(): Promise<boolean> {
    try {
      await unlink(this.name);
      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return false;
      } else {
        throw err;
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

  open(
    flags: string | number,
    mode?: string | number | null,
  ): Promise<FileHandle> {
    return FileHandle.open(this.name, flags, mode);
  }

  read(): Promise<Buffer>;
  read(options: Encoding): Promise<string>;
  read(options?: ReadOptions | Encoding): Promise<Buffer | string>;
  read(options?: ReadOptions | Encoding): Promise<Buffer | string> {
    return readFile(this.name, options);
  }

  async write(data: any, options?: WriteOptions | Encoding): Promise<boolean> {
    await this.dir().create();
    try {
      await writeFile(this.name, data, options);
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
      await appendFile(this.name, data, options);
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
