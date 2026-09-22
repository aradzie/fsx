import type { Stats } from "@sosimple/fsx";
import {
  close,
  fchmod,
  fchown,
  fdatasync,
  fstat,
  fsync,
  ftruncate,
  futimes,
  open,
  read,
  write,
} from "@sosimple/fsx";
import type { Encoding } from "./types.js";
import { readFileHandle, toBuffer, writeFileHandle } from "./util.js";

/**
 * A `FileHandle` object is a wrapper for a numeric file descriptor.
 * Instances of `FileHandle` are distinct from numeric file descriptors in that
 * they provide an object-oriented API for working with files.
 */
export class FileHandle {
  static async open(
    path: string,
    flags: string | number,
    mode?: string | number | null,
  ): Promise<FileHandle> {
    return new FileHandle(path, await open(path, flags, mode));
  }

  readonly #path: string;
  readonly #fd: number;

  constructor(path: string, fd: number) {
    this.#path = path;
    this.#fd = fd;
  }

  get path(): string {
    return this.#path;
  }

  get fd(): number {
    return this.#fd;
  }

  async close(): Promise<void> {
    return close(this.#fd);
  }

  async chmod(mode: string | number): Promise<void> {
    return fchmod(this.#fd, mode);
  }

  async chown(uid: number, gid: number): Promise<void> {
    return fchown(this.#fd, uid, gid);
  }

  async stat(): Promise<Stats> {
    return fstat(this.#fd);
  }

  async utimes(
    atime: string | number | Date,
    mtime: string | number | Date,
  ): Promise<void> {
    return futimes(this.#fd, atime, mtime);
  }

  async sync(): Promise<void> {
    return fsync(this.#fd);
  }

  async datasync(): Promise<void> {
    return fdatasync(this.#fd);
  }

  async truncate(length?: number): Promise<void> {
    return ftruncate(this.#fd, length);
  }

  /**
   * Asynchronously reads data from the file.
   * @param buffer The buffer that the data will be written to.
   * @param offset The offset in the buffer at which to start writing.
   * @param length The number of bytes to read.
   * @param position The offset from the beginning of the file from which data
   *                 should be read. If `null`, data will be read from the
   *                 current position.
   */
  async read<TBuffer extends NodeJS.ArrayBufferView>(
    buffer: TBuffer,
    offset: number,
    length: number,
    position: number | null = null,
  ): Promise<{
    bytesRead: number;
    buffer: TBuffer;
  }> {
    return read(this.#fd, buffer, offset, length, position);
  }

  /**
   * Asynchronously writes the given data to this file.
   * @param buffer The data to write.
   * @param offset The part of the buffer to be written. If not supplied,
   *               defaults to `0`.
   * @param length The number of bytes to write. If not supplied, defaults to
   *               `buffer.length - offset`.
   * @param position The offset from the beginning of the file where this data
   *                 should be written. If not supplied, defaults to the
   *                 current position.
   */
  async write<TBuffer extends NodeJS.ArrayBufferView>(
    buffer: TBuffer,
    offset?: number,
    length?: number,
    position?: number,
  ): Promise<{
    bytesWritten: number;
    buffer: TBuffer;
  }> {
    return write(this.#fd, buffer, offset, length, position);
  }

  /**
   * Asynchronously reads the entire contents of a file.
   *
   * The underlying file will _not_ be closed automatically.
   */
  async readFile(): Promise<Buffer>;

  /**
   * Asynchronously reads the entire contents of a file.
   *
   * The underlying file will _not_ be closed automatically.
   */
  async readFile(encoding: Encoding): Promise<string>;

  async readFile(encoding?: Encoding): Promise<Buffer | string> {
    const buffer = await readFileHandle(this.#fd);
    if (encoding) {
      return buffer.toString(encoding);
    } else {
      return buffer;
    }
  }

  /**
   * Asynchronously writes the given contents to a file, replacing any old
   * contents.
   *
   * The underlying file will _not_ be closed automatically.
   *
   * It is unsafe to call `writeFile()` multiple times on the same file
   * without waiting for the `Promise` to be resolved (or rejected).
   */
  async writeFile(data: NodeJS.ArrayBufferView): Promise<void>;

  /**
   * Asynchronously writes the given contents to a file, replacing any old
   * contents.
   *
   * The underlying file will _not_ be closed automatically.
   *
   * It is unsafe to call `writeFile()` multiple times on the same file
   * without waiting for the `Promise` to be resolved (or rejected).
   */
  async writeFile(data: string, encoding?: Encoding): Promise<void>;

  async writeFile(
    data: NodeJS.ArrayBufferView | string,
    encoding?: Encoding,
  ): Promise<void> {
    await writeFileHandle(this.#fd, toBuffer(data, encoding), false);
  }

  /**
   * Asynchronously append the given contents to a file.
   *
   * The underlying file will _not_ be closed automatically.
   *
   * It is unsafe to call `appendFile()` multiple times on the same file
   * without waiting for the `Promise` to be resolved (or rejected).
   */
  async appendFile(data: NodeJS.ArrayBufferView): Promise<void>;

  /**
   * Asynchronously append the given contents to a file.
   *
   * The underlying file will _not_ be closed automatically.
   *
   * It is unsafe to call `appendFile()` multiple times on the same file
   * without waiting for the `Promise` to be resolved (or rejected).
   */
  async appendFile(data: string, encoding?: Encoding): Promise<void>;

  async appendFile(
    data: NodeJS.ArrayBufferView | string,
    encoding?: Encoding,
  ): Promise<void> {
    await writeFileHandle(this.#fd, toBuffer(data, encoding), true);
  }

  get [Symbol.toStringTag](): string {
    return "FileHandle";
  }
}
