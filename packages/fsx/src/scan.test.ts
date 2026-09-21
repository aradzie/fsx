import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  existsSync,
  mkdirSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "./fs.js";
import {
  emptyDir,
  emptyDirSync,
  removeDir,
  removeDirSync,
  scanDir,
  scanDirSync,
} from "./scan.js";

beforeEach(() => {
  mkdirSync("/tmp/scan-test-dir/a/1", { recursive: true });
  mkdirSync("/tmp/scan-test-dir/b/2", { recursive: true });
  writeFileSync("/tmp/scan-test-dir/b/2/file1", "something");
  symlinkSync("./file1", "/tmp/scan-test-dir/b/2/file2");
});

afterEach(() => {
  safeRmdirSync("/tmp/scan-test-dir/a/1");
  safeRmdirSync("/tmp/scan-test-dir/a");
  safeUnlinkSync("/tmp/scan-test-dir/b/2/file1");
  safeUnlinkSync("/tmp/scan-test-dir/b/2/file2");
  safeRmdirSync("/tmp/scan-test-dir/b/2");
  safeRmdirSync("/tmp/scan-test-dir/b");
  safeRmdirSync("/tmp/scan-test-dir");
});

test("scan of a missing dir - async", async () => {
  await assert.doesNotReject(async () => {
    await scanDir("/this/directory/does/not/exist");
  });
});

test("scan of a missing dir - sync", () => {
  assert.doesNotThrow(() => {
    scanDirSync("/this/directory/does/not/exist");
  });
});

test("scan skips over deleted entries - async", async () => {
  const it = scanDir("/tmp/scan-test-dir")[Symbol.asyncIterator]();

  const a = await it.next();
  assert.strictEqual(a.done, false);
  assert.strictEqual(a.value.path, "a");

  rmdirSync("/tmp/scan-test-dir/a/1");
  rmdirSync("/tmp/scan-test-dir/a");

  const b = await it.next();
  assert.strictEqual(b.done, false);
  assert.strictEqual(b.value.path, "b");

  unlinkSync("/tmp/scan-test-dir/b/2/file1");
  unlinkSync("/tmp/scan-test-dir/b/2/file2");
  rmdirSync("/tmp/scan-test-dir/b/2");
  rmdirSync("/tmp/scan-test-dir/b");

  const c = await it.next();
  assert.strictEqual(c.done, true);
});

test("scan skips over deleted entries - sync", () => {
  const it = scanDirSync("/tmp/scan-test-dir")[Symbol.iterator]();

  const a = it.next();
  assert.strictEqual(a.done, false);
  assert.strictEqual(a.value.path, "a");

  rmdirSync("/tmp/scan-test-dir/a/1");
  rmdirSync("/tmp/scan-test-dir/a");

  const b = it.next();
  assert.strictEqual(b.done, false);
  assert.strictEqual(b.value.path, "b");

  unlinkSync("/tmp/scan-test-dir/b/2/file1");
  unlinkSync("/tmp/scan-test-dir/b/2/file2");
  rmdirSync("/tmp/scan-test-dir/b/2");
  rmdirSync("/tmp/scan-test-dir/b");

  const c = it.next();
  assert.strictEqual(c.done, true);
});

test("scan of an existing dir - async", async () => {
  const entries = [];
  for await (const entry of scanDir("/tmp/scan-test-dir")) {
    entries.push(entry);
  }

  assert.deepStrictEqual(
    entries.map(({ path }) => path),
    ["a", "a/1", "b", "b/2", "b/2/file1", "b/2/file2"],
  );
  assert.strictEqual(entries[0].stats.isDirectory(), true);
  assert.strictEqual(entries[1].stats.isDirectory(), true);
  assert.strictEqual(entries[2].stats.isDirectory(), true);
  assert.strictEqual(entries[3].stats.isDirectory(), true);
  assert.strictEqual(entries[4].stats.isFile(), true);
  assert.strictEqual(entries[5].stats.isSymbolicLink(), true);
});

test("scan of an existing dir - sync", () => {
  const entries = [];
  for (const entry of scanDirSync("/tmp/scan-test-dir")) {
    entries.push(entry);
  }

  assert.deepStrictEqual(
    entries.map(({ path }) => path),
    ["a", "a/1", "b", "b/2", "b/2/file1", "b/2/file2"],
  );
  assert.strictEqual(entries[0].stats.isDirectory(), true);
  assert.strictEqual(entries[1].stats.isDirectory(), true);
  assert.strictEqual(entries[2].stats.isDirectory(), true);
  assert.strictEqual(entries[3].stats.isDirectory(), true);
  assert.strictEqual(entries[4].stats.isFile(), true);
  assert.strictEqual(entries[5].stats.isSymbolicLink(), true);
});

test("empty dir - async", async () => {
  await emptyDir("/tmp/scan-test-dir");

  assert.strictEqual(existsSync("/tmp/scan-test-dir"), true);
  assert.strictEqual(existsSync("/tmp/scan-test-dir/a"), false);
  assert.strictEqual(existsSync("/tmp/scan-test-dir/b"), false);
});

test("empty dir - sync", () => {
  emptyDirSync("/tmp/scan-test-dir");

  assert.strictEqual(existsSync("/tmp/scan-test-dir"), true);
  assert.strictEqual(existsSync("/tmp/scan-test-dir/a"), false);
  assert.strictEqual(existsSync("/tmp/scan-test-dir/b"), false);
});

test("remove dir - async", async () => {
  await removeDir("/tmp/scan-test-dir");

  assert.strictEqual(existsSync("/tmp/scan-test-dir"), false);
});

test("remove dir - sync", () => {
  removeDirSync("/tmp/scan-test-dir");

  assert.strictEqual(existsSync("/tmp/scan-test-dir"), false);
});

function safeRmdirSync(path: string): void {
  try {
    rmdirSync(path);
  } catch {
    /* Ignore. */
  }
}

function safeUnlinkSync(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    /* Ignore. */
  }
}
