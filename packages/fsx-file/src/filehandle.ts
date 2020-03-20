import {
  close,
  fchmod,
  fchown,
  fstat,
  fsync,
  ftruncate,
  futimes,
  open,
  read,
  Stats,
  write,
} from "@aradzie/fsx";
import type { Encoding } from "./file";

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

  get name(): string {
    return this[kName];
  }

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

  async truncate(length?: number): Promise<void> {
    return ftruncate(this[kFd], length);
  }

  async sync(): Promise<void> {
    return fsync(this[kFd]);
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

const chunkSize = 16384;

async function readFileHandle(fd: number): Promise<Buffer> {
  const chunks = [];
  let position = 0;
  while (true) {
    const tmp = Buffer.alloc(chunkSize);
    const { bytesRead, buffer } = await read(fd, tmp, 0, chunkSize, position);
    if (bytesRead > 0) {
      chunks.push(buffer.slice(0, bytesRead));
      position += bytesRead;
    } else {
      break;
    }
  }
  return Buffer.concat(chunks);
}

async function writeFileHandle(
  fd: number,
  buffer: Buffer,
  append: boolean,
): Promise<void> {
  let remaining = buffer.length;
  let position = 0;
  if (append) {
    position = (await fstat(fd)).size;
  }
  while (remaining > 0) {
    const { bytesWritten } = await write(
      fd,
      buffer,
      0,
      Math.min(chunkSize, buffer.length),
      position,
    );
    buffer = buffer.slice(bytesWritten);
    remaining -= bytesWritten;
    position += bytesWritten;
  }
}

function toBuffer(
  data: NodeJS.ArrayBufferView | string,
  encoding: Encoding = "utf8",
): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (typeof data === "string") {
    return Buffer.from(data, encoding);
  }
  throw new TypeError();
}
