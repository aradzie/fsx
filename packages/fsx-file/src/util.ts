import { fstat, read, write } from "@sosimple/fsx";
import type { Encoding } from "./types.js";

const chunkSize = 16384;

/**
 * Asynchronously reads the entire contents of a file.
 */
export async function readFileHandle(fd: number): Promise<Buffer> {
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

/**
 * Asynchronously writes data to a file, replacing any old contents.
 */
export async function writeFileHandle(
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

export function toBuffer(
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
