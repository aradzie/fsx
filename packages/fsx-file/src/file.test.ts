import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import test, { afterEach, beforeEach } from "node:test";
import { chmodSync, mkdtempSync, rmSync } from "@sosimple/fsx";
import { Dir, File } from "./file.js";

let root: Dir;
let dir: Dir;
let file: File;

beforeEach(async () => {
  root = new Dir(mkdtempSync(join(tmpdir(), "fsx-file-")));
  dir = new Dir(join(root.path, "a", "b", "c"));
  file = new File(join(dir.path, "file"));
});

afterEach(async () => {
  rmSync(root.path, { recursive: true, force: true });
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
  assert.strictEqual(await dir.exists(), false);
  assert.strictEqual(await new Dir(join(root.path, "a")).exists(), false);
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
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString();
}

test("write streams honor append flags", async () => {
  await file.write("old");
  const stream = file.writeStream({ flag: "a", encoding: "utf8" });
  const done = finished(stream);
  stream.end("new");
  await done;
  assert.equal(await file.read("utf8"), "oldnew");
});

for (const flag of ["wx", "ax"] as const) {
  test(`write streams honor exclusive flag ${flag}`, async () => {
    await file.write("keep");
    const stream = file.writeStream({ flag });
    const rejected = assert.rejects(finished(stream), { code: "EEXIST" });
    stream.end("replacement");
    await rejected;
    assert.equal(await file.read("utf8"), "keep");
    const fresh = new File(join(dir.path, "fresh"));
    const created = fresh.writeStream({ flag });
    const done = finished(created);
    created.end("created");
    await done;
    assert.equal(await fresh.read("utf8"), "created");
  });
}

test("stream encoding shorthand still works", async () => {
  await dir.create();
  const stream = file.writeStream("hex");
  const done = finished(stream);
  stream.end("616263");
  await done;
  assert.equal(await readAll(file.readStream("utf8")), "abc");
});

test("read streams honor read/write flags", async (t) => {
  if (process.platform === "win32" || process.getuid?.() === 0) {
    t.skip("Requires POSIX permissions and an unprivileged user");
    return;
  }
  await file.write("readable");
  chmodSync(file.path, 0o444);
  try {
    assert.equal(await readAll(file.readStream({ flag: "r" })), "readable");
    await assert.rejects(readAll(file.readStream({ flag: "r+" })), {
      code: "EACCES",
    });
  } finally {
    chmodSync(file.path, 0o600);
  }
});

test("writeJson reports successful and rejected exclusive writes", async () => {
  assert.equal(
    await file.writeJson({ value: 1 }, { flag: "wx", space: 2 }),
    true,
  );
  assert.equal(await file.read("utf8"), '{\n  "value": 1\n}');
  assert.equal(await file.writeJson({ value: 2 }, { flag: "wx" }), false);
  assert.deepEqual(await file.readJson(), { value: 1 });
  assert.equal(await file.writeJson({ value: 3 }), true);
  assert.deepEqual(await file.readJson(), { value: 3 });
});

test("Dir.delete removes empty directories and reports missing ones", async () => {
  assert.equal(await dir.delete(), false);
  await dir.create();
  assert.equal(await dir.delete(), true);
  assert.equal(await dir.exists(), false);
  assert.equal(await dir.delete(), false);
});

test("Dir.delete preserves nonempty directories", async () => {
  await file.write("keep");
  await assert.rejects(
    dir.delete(),
    (err: NodeJS.ErrnoException) =>
      err.code === "ENOTEMPTY" || err.code === "EEXIST",
  );
  assert.equal(await file.read("utf8"), "keep");
  await dir.remove();
  assert.equal(await dir.exists(), false);
});

test("File.delete still removes files and reports missing ones", async () => {
  await file.write("remove");
  assert.equal(await file.delete(), true);
  assert.equal(await file.exists(), false);
  assert.equal(await file.delete(), false);
});
