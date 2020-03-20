import { join } from "path";
import {
  readdir,
  readdirSync,
  rmdir,
  stat,
  Stats,
  statSync,
  unlink,
} from "./fs";

export interface Entry {
  readonly path: string;
  readonly stats: Stats;
}

export async function* scanDir(dir: string): AsyncIterable<Entry> {
  for (const item of await readdir(dir)) {
    yield* scan(dir, item);
  }
}

async function* scan(dir: string, suffix: string): AsyncIterable<Entry> {
  const path = join(dir, suffix);
  const stats = await stat(path);
  if (stats.isDirectory()) {
    for (const item of await readdir(path)) {
      yield* scan(dir, join(suffix, item));
    }
  } else if (stats.isFile()) {
    yield { path: suffix, stats };
  }
}

export function* scanDirSync(dir: string): Iterable<Entry> {
  for (const item of readdirSync(dir)) {
    yield* scanSync(dir, item);
  }
}

function* scanSync(dir: string, suffix: string): Iterable<Entry> {
  const path = join(dir, suffix);
  const stats = statSync(path);
  if (stats.isDirectory()) {
    for (const item of readdirSync(path)) {
      yield* scanSync(dir, join(suffix, item));
    }
  } else if (stats.isFile()) {
    yield { path: suffix, stats };
  }
}

export async function emptyDir(dir: string): Promise<void> {
  for await (const entry of start(dir)) {
    await kill(entry);
  }
}

export async function removeDir(dir: string): Promise<void> {
  for await (const entry of start(dir)) {
    await kill(entry);
  }
  try {
    await rmdir(dir);
  } catch (ex) {
    if (ex.code !== "ENOENT") {
      throw ex;
    }
  }
}

async function* start(dir: string): AsyncIterable<Entry> {
  try {
    for (const item of await readdir(dir)) {
      yield* list(join(dir, item));
    }
  } catch (ex) {
    if (ex.code !== "ENOENT") {
      throw ex;
    }
  }
}

async function* list(dir: string): AsyncIterable<Entry> {
  try {
    const stats = await stat(dir);
    if (stats.isDirectory()) {
      for (const item of await readdir(dir)) {
        yield* list(join(dir, item));
      }
    }
    yield { path: dir, stats };
  } catch (ex) {
    if (ex.code !== "ENOENT") {
      throw ex;
    }
  }
}

async function kill({ path, stats }: Entry): Promise<void> {
  try {
    if (stats.isFile() || stats.isSymbolicLink()) {
      await unlink(path);
    } else if (stats.isDirectory()) {
      await rmdir(path);
    }
  } catch (ex) {
    if (ex.code !== "ENOENT") {
      throw ex;
    }
  }
}
