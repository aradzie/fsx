import test from "ava";
import { Dir, File } from "./file";
import { FileHandle } from "./filehandle";

const root = new Dir("/tmp/test-fs-filehandle");
const file = new File("/tmp/test-fs-filehandle/file");

test.beforeEach(async () => {
  await root.remove();
  await root.create();
});

test.afterEach(async () => {
  await root.remove();
});

test.serial("read from file", async (t) => {
  // Arrange.

  const content = "abc\n".repeat(10_000);
  await file.write(content);

  // Act.

  const handle = await FileHandle.open(file.name, "r");
  const read = await handle.readFile("utf8");
  await handle.close();

  // Assert.

  t.is(content, read);
});

test.serial("write to file", async (t) => {
  // Act.

  const handle = await FileHandle.open(file.name, "w");
  await handle.writeFile("uno\n");
  await handle.writeFile("due\n");
  await handle.writeFile("tre\n");
  await handle.close();

  // Assert.

  t.is(await file.read("utf8"), "tre\n");
});

test.serial("append to file", async (t) => {
  // Act.

  const handle = await FileHandle.open(file.name, "w");
  await handle.writeFile("uno\n");
  await handle.appendFile("due\n");
  await handle.appendFile("tre\n");
  await handle.close();

  // Assert.

  t.is(await file.read("utf8"), "uno\ndue\ntre\n");
});

test.serial("write then append then read from file", async (t) => {
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

  t.is(read, a + b + c);
});
