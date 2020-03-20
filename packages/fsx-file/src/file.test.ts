import test from "ava";
import type { Readable } from "stream";
import { Dir, File } from "./file";

const root = new Dir("/tmp/test-fs-file");
const dir = new Dir("/tmp/test-fs-file/a/b/c");
const file = new File("/tmp/test-fs-file/a/b/c/file");

test.beforeEach(async () => {
  await root.remove();
  await root.create();
});

test.afterEach(async () => {
  await root.remove();
});

test.serial("handle missing files or directories", async (t) => {
  await t.throwsAsync(async () => dir.readable());
  await t.throwsAsync(async () => dir.writable());

  await t.throwsAsync(async () => file.readable());
  await t.throwsAsync(async () => file.writable());
});

test.serial("read and write files and directories", async (t) => {
  // Act.

  await file.write(Buffer.from("one\n"));
  await file.append(Buffer.from("two\n"));
  await file.append(Buffer.from("three\n"));

  // Assert.

  t.is(String(await file.read()), "one\ntwo\nthree\n");
  t.is(await readAll(await file.readStream()), "one\ntwo\nthree\n");

  t.true(await dir.exists());
  t.true(await dir.readable());
  t.true(await dir.writable());

  t.true(await file.exists());
  t.true(await file.readable());
  t.true(await file.writable());
});

test.serial("touch a missing file", async (t) => {
  // Act.

  t.true(await file.touch());

  // Assert.

  t.true(await root.exists());
  t.true(await file.exists());
  t.is(await file.read({ encoding: "utf8" }), "");
});

test.serial("touch a missing file and honor no-create", async (t) => {
  // Act.

  t.false(await file.touch({ create: false }));

  // Assert.

  t.true(await root.exists());
  t.false(await file.exists());
});

test.serial("touch an existing file", async (t) => {
  // Arrange.

  await file.write("something", { encoding: "utf8" });
  await file.utimes(new Date(0), new Date(0));
  const stat0 = await file.stat();

  // Act.

  t.true(await file.touch());
  const stat1 = await file.stat();

  // Assert.

  t.true(await root.exists());
  t.true(await file.exists());
  t.is(await file.read({ encoding: "utf8" }), "something");
  t.deepEqual(stat0.atime, new Date(0));
  t.deepEqual(stat0.mtime, new Date(0));
  t.notDeepEqual(stat1.atime, new Date(0));
  t.notDeepEqual(stat1.mtime, new Date(0));
});

test.serial("touch an existing file and honor no-create", async (t) => {
  // Arrange.

  await file.write("something", { encoding: "utf8" });
  await file.utimes(new Date(0), new Date(0));
  const stat0 = await file.stat();

  // Act.

  t.true(await file.touch({ create: false }));
  const stat1 = await file.stat();

  // Assert.

  t.true(await root.exists());
  t.true(await file.exists());
  t.is(await file.read({ encoding: "utf8" }), "something");
  t.deepEqual(stat0.atime, new Date(0));
  t.deepEqual(stat0.mtime, new Date(0));
  t.notDeepEqual(stat1.atime, new Date(0));
  t.notDeepEqual(stat1.mtime, new Date(0));
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
