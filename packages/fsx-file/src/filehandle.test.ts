import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { Dir, File } from "./file.js";
import { FileHandle } from "./filehandle.js";

const root = new Dir("/tmp/test-fs-filehandle");
const file = new File("/tmp/test-fs-filehandle/file");

beforeEach(async () => {
  await root.remove();
  await root.create();
});

afterEach(async () => {
  await root.remove();
});

test("read from file", async () => {
  // Arrange.

  const content = "abc\n".repeat(10_000);
  await file.write(content);

  // Act.

  const handle = await FileHandle.open(file.name, "r");
  const read = await handle.readFile("utf8");
  await handle.close();

  // Assert.

  assert.strictEqual(content, read);
});

test("write to file", async () => {
  // Act.

  const handle = await FileHandle.open(file.name, "w");
  await handle.writeFile("uno\n");
  await handle.writeFile("due\n");
  await handle.writeFile("tre\n");
  await handle.close();

  // Assert.

  assert.strictEqual(await file.read("utf8"), "tre\n");
});

test("append to file", async () => {
  // Act.

  const handle = await FileHandle.open(file.name, "w");
  await handle.writeFile("uno\n");
  await handle.appendFile("due\n");
  await handle.appendFile("tre\n");
  await handle.close();

  // Assert.

  assert.strictEqual(await file.read("utf8"), "uno\ndue\ntre\n");
});

test("write then append then read from file", async () => {
  // Arrange.

  const a = "aaa".repeat(100_000) + "\n";
  const b = "bbb".repeat(100_000) + "\n";
  const c = "ccc".repeat(100_000) + "\n";

  // Act.

  const handle = await FileHandle.open(file.name, "w+");
  await handle.writeFile(a);
  await handle.appendFile(b);
  await handle.appendFile(c);
  const read = await handle.readFile("utf8");
  await handle.close();

  // Assert.

  assert.strictEqual(read, a + b + c);
});
