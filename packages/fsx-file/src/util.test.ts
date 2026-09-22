import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import test from "node:test";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "@sosimple/fsx";
import { FileHandle } from "./filehandle.js";
import { toBuffer } from "./util.js";

async function fixture(t: TestContext): Promise<FileHandle> {
  const dir = mkdtempSync(join(tmpdir(), "fsx-util-"));
  const file = join(dir, "file");
  writeFileSync(file, "old contents");
  const handle = await FileHandle.open(file, "r+");
  t.after(async () => {
    try {
      await handle.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  return handle;
}

for (const content of ["xy", "", "abc".repeat(20_000)]) {
  test(`writeFile replaces contents with ${content.length} characters`, async (t) => {
    const handle = await fixture(t);
    await handle.writeFile(content);
    assert.equal(readFileSync(handle.path, "utf8"), content);
  });
}

test("appendFile preserves contents, including when appending an empty buffer", async (t) => {
  const handle = await fixture(t);
  await handle.appendFile(Buffer.alloc(0));
  assert.equal(readFileSync(handle.path, "utf8"), "old contents");
  await handle.appendFile(" appended");
  assert.equal(readFileSync(handle.path, "utf8"), "old contents appended");
});

for (const [name, makeView] of [
  ["Uint8Array", (buffer: ArrayBuffer) => new Uint8Array(buffer, 2, 4)],
  ["Uint16Array", (buffer: ArrayBuffer) => new Uint16Array(buffer, 2, 2)],
  ["DataView", (buffer: ArrayBuffer) => new DataView(buffer, 2, 4)],
] as const) {
  test(`converts and writes only the selected bytes of a ${name}`, async (t) => {
    const bytes = new Uint8Array([255, 255, 1, 2, 3, 4, 255, 255]);
    const view = makeView(bytes.buffer);
    const expected = Buffer.from([1, 2, 3, 4]);
    assert.deepEqual(toBuffer(view), expected);
    const handle = await fixture(t);
    await handle.writeFile(view);
    assert.deepEqual(readFileSync(handle.path), expected);
    await handle.appendFile(view);
    assert.deepEqual(
      readFileSync(handle.path),
      Buffer.concat([expected, expected]),
    );
  });
}

test("converts an empty view without including backing bytes", () => {
  assert.deepEqual(
    toBuffer(new Uint8Array(new ArrayBuffer(8), 4, 0)),
    Buffer.alloc(0),
  );
});

test("preserves buffers and decodes strings using the requested encoding", () => {
  const buffer = Buffer.from([1, 2, 3]);
  assert.equal(toBuffer(buffer), buffer);
  assert.deepEqual(toBuffer("010203", "hex"), buffer);
});
