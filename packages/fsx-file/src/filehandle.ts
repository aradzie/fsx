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
  Stats,
  write,
} from "@aradzie/fsx";
import type { Encoding } from "./types";
import { readFileHandle, toBuffer, writeFileHandle } from "./util";

const kName = Symbol();
const kFd = Symbol();

/**
 * A `FileHandle` object is a wrapper for a numeric file descriptor.
 * Instances of `FileHandle` are distinct from numeric file descriptors in that
 * they provide an object oriented API for working with files.
 */
export class FileHandle {
  static async open(
    name: string,
    flags: string | number,
    mode?: string | number | null,
  ): Promise<FileHandle> {
    return new FileHandle(name, await open(name, flags, mode));
  }

  private [kName]: string;
  private [kFd]: number;

  constructor(name: string, fd: number) {
    this[kName] = name;
    this[kFd] = fd;
  }

  /**
   * Gets file name.
   */
  get name(): string {
    return this[kName];
  }

  /**
   * Gets file descriptor.
   */
  get fd(): number {
    return this[kFd];
  }

  async close(): Promise<void> {
    return close(this[kFd]);
  }

  async chmod(mode: string | number): Promise<void> {
    return fchmod(this[kFd], mode);
  }

  async chown(uid: number, gid: number): Promise<void> {
    return fchown(this[kFd], uid, gid);
  }

  async stat(): Promise<Stats> {
    return fstat(this[kFd]);
  }

  async utimes(
    atime: string | number | Date,
    mtime: string | number | Date,
  ): Promise<void> {
    return futimes(this[kFd], atime, mtime);
  }

  async sync(): Promise<void> {
    return fsync(this[kFd]);
  }

  async datasync(): Promise<void> {
    return fdatasync(this[kFd]);
  }

  async truncate(length?: number): Promise<void> {
    return ftruncate(this[kFd], length);
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
    return read(this[kFd], buffer, offset, length, position);
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
    return write(this[kFd], buffer, offset, length, position);
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
    const buffer = await readFileHandle(this[kFd]);
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
    await writeFileHandle(this[kFd], toBuffer(data, encoding), false);
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
    await writeFileHandle(this[kFd], toBuffer(data, encoding), true);
  }

  get [Symbol.toStringTag](): string {
    return "FileHandle";
  }
}
