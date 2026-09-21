import assert from "node:assert/strict";
import type { Readable } from "node:stream";
import test, { afterEach, beforeEach } from "node:test";
import { Dir, File } from "./file.js";

const root = new Dir("/tmp/test-fs-file");
const dir = new Dir("/tmp/test-fs-file/a/b/c");
const file = new File("/tmp/test-fs-file/a/b/c/file");

beforeEach(async () => {
  await root.remove();
  await root.create();
});

afterEach(async () => {
  await root.remove();
});

test("handle missing files or directories", async () => {
  await assert.rejects(async () => dir.readable());
  await assert.rejects(async () => dir.writable());

  await assert.rejects(async () => file.readable());
  await assert.rejects(async () => file.writable());
});

test("read and write files and directories", async () => {
  // Act.

  await file.write(Buffer.from("one\n"));
  await file.append(Buffer.from("two\n"));
  await file.append(Buffer.from("three\n"));

  // Assert.

  assert.strictEqual(String(await file.read()), "one\ntwo\nthree\n");
  assert.strictEqual(
    await readAll(await file.readStream()),
    "one\ntwo\nthree\n",
  );

  assert.strictEqual(await dir.exists(), true);
  assert.strictEqual(await dir.readable(), true);
  assert.strictEqual(await dir.writable(), true);

  assert.strictEqual(await file.exists(), true);
  assert.strictEqual(await file.readable(), true);
  assert.strictEqual(await file.writable(), true);
});

test("touch a missing file", async () => {
  // Act.

  assert.strictEqual(await file.touch(), true);

  // Assert.

  assert.strictEqual(await root.exists(), true);
  assert.strictEqual(await file.exists(), true);
  assert.strictEqual(await file.read({ encoding: "utf8" }), "");
});

test("touch a missing file and honor no-create", async () => {
  // Act.

  assert.strictEqual(await file.touch({ create: false }), false);

  // Assert.

  assert.strictEqual(await root.exists(), true);
  assert.strictEqual(await file.exists(), false);
});

test("touch an existing file", async () => {
  // Arrange.

  await file.write("something", { encoding: "utf8" });
  await file.utimes(new Date(0), new Date(0));
  const stat0 = await file.stat();

  // Act.

  assert.strictEqual(await file.touch(), true);
  const stat1 = await file.stat();

  // Assert.

  assert.strictEqual(await root.exists(), true);
  assert.strictEqual(await file.exists(), true);
  assert.strictEqual(await file.read({ encoding: "utf8" }), "something");
  assert.deepStrictEqual(stat0.atime, new Date(0));
  assert.deepStrictEqual(stat0.mtime, new Date(0));
  assert.notDeepStrictEqual(stat1.atime, new Date(0));
  assert.notDeepStrictEqual(stat1.mtime, new Date(0));
});

test("touch an existing file and honor no-create", async () => {
  // Arrange.

  await file.write("something", { encoding: "utf8" });
  await file.utimes(new Date(0), new Date(0));
  const stat0 = await file.stat();

  // Act.

  assert.strictEqual(await file.touch({ create: false }), true);
  const stat1 = await file.stat();

  // Assert.

  assert.strictEqual(await root.exists(), true);
  assert.strictEqual(await file.exists(), true);
  assert.strictEqual(await file.read({ encoding: "utf8" }), "something");
  assert.deepStrictEqual(stat0.atime, new Date(0));
  assert.deepStrictEqual(stat0.mtime, new Date(0));
  assert.notDeepStrictEqual(stat1.atime, new Date(0));
  assert.notDeepStrictEqual(stat1.mtime, new Date(0));
});

async function readAll(readable: Readable): Promise<string> {
  const enableExperimental = false;
  if (enableExperimental) {
    const result = [];
    for await (const chunk of readable) {
      result.push(chunk);
    }
    return result.join("");
  } else {
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      readable.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      readable.on("end", () => {
        resolve(String(Buffer.concat(chunks)));
      });
      readable.on("error", reject);
    });
  }
}
