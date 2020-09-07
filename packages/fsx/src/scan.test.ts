import test from "ava";
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

test.beforeEach(() => {
  mkdirSync("/tmp/scan-test-dir/a/1", { recursive: true });
  mkdirSync("/tmp/scan-test-dir/b/2", { recursive: true });
  writeFileSync("/tmp/scan-test-dir/b/2/file1", "something");
  symlinkSync("./file1", "/tmp/scan-test-dir/b/2/file2");
});

test.afterEach(() => {
  safeRmdirSync("/tmp/scan-test-dir/a/1");
  safeRmdirSync("/tmp/scan-test-dir/a");
  safeUnlinkSync("/tmp/scan-test-dir/b/2/file1");
  safeUnlinkSync("/tmp/scan-test-dir/b/2/file2");
  safeRmdirSync("/tmp/scan-test-dir/b/2");
  safeRmdirSync("/tmp/scan-test-dir/b");
  safeRmdirSync("/tmp/scan-test-dir");
});

test("scan of a missing dir - async", async (t) => {
  await t.notThrowsAsync(async () => {
    await scanDir("/this/directory/does/not/exist");
  });
});

test("scan of a missing dir - sync", (t) => {
  t.notThrows(() => {
    scanDirSync("/this/directory/does/not/exist");
  });
});

test("scan skips over deleted entries - async", async (t) => {
  const it = scanDir("/tmp/scan-test-dir")[Symbol.asyncIterator]();

  const a = await it.next();
  t.false(a.done);
  t.is(a.value.path, "a");

  rmdirSync("/tmp/scan-test-dir/a/1");
  rmdirSync("/tmp/scan-test-dir/a");

  const b = await it.next();
  t.false(b.done);
  t.is(b.value.path, "b");

  unlinkSync("/tmp/scan-test-dir/b/2/file1");
  unlinkSync("/tmp/scan-test-dir/b/2/file2");
  rmdirSync("/tmp/scan-test-dir/b/2");
  rmdirSync("/tmp/scan-test-dir/b");

  const c = await it.next();
  t.is(c.done, true);
});

test("scan skips over deleted entries - sync", (t) => {
  const it = scanDirSync("/tmp/scan-test-dir")[Symbol.iterator]();

  const a = it.next();
  t.false(a.done);
  t.is(a.value.path, "a");

  rmdirSync("/tmp/scan-test-dir/a/1");
  rmdirSync("/tmp/scan-test-dir/a");

  const b = it.next();
  t.false(b.done);
  t.is(b.value.path, "b");

  unlinkSync("/tmp/scan-test-dir/b/2/file1");
  unlinkSync("/tmp/scan-test-dir/b/2/file2");
  rmdirSync("/tmp/scan-test-dir/b/2");
  rmdirSync("/tmp/scan-test-dir/b");

  const c = it.next();
  t.is(c.done, true);
});

test("scan of an existing dir - async", async (t) => {
  const entries = [];
  for await (const entry of scanDir("/tmp/scan-test-dir")) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(({ path }) => path),
    ["a", "a/1", "b", "b/2", "b/2/file1", "b/2/file2"],
  );
  t.true(entries[0].stats.isDirectory());
  t.true(entries[1].stats.isDirectory());
  t.true(entries[2].stats.isDirectory());
  t.true(entries[3].stats.isDirectory());
  t.true(entries[4].stats.isFile());
  t.true(entries[5].stats.isSymbolicLink());
});

test("scan of an existing dir - sync", (t) => {
  const entries = [];
  for (const entry of scanDirSync("/tmp/scan-test-dir")) {
    entries.push(entry);
  }

  t.deepEqual(
    entries.map(({ path }) => path),
    ["a", "a/1", "b", "b/2", "b/2/file1", "b/2/file2"],
  );
  t.true(entries[0].stats.isDirectory());
  t.true(entries[1].stats.isDirectory());
  t.true(entries[2].stats.isDirectory());
  t.true(entries[3].stats.isDirectory());
  t.true(entries[4].stats.isFile());
  t.true(entries[5].stats.isSymbolicLink());
});

test("empty dir - async", async (t) => {
  await emptyDir("/tmp/scan-test-dir");

  t.true(existsSync("/tmp/scan-test-dir"));
  t.false(existsSync("/tmp/scan-test-dir/a"));
  t.false(existsSync("/tmp/scan-test-dir/b"));
});

test("empty dir - sync", (t) => {
  emptyDirSync("/tmp/scan-test-dir");

  t.true(existsSync("/tmp/scan-test-dir"));
  t.false(existsSync("/tmp/scan-test-dir/a"));
  t.false(existsSync("/tmp/scan-test-dir/b"));
});

test("remove dir - async", async (t) => {
  await removeDir("/tmp/scan-test-dir");

  t.false(existsSync("/tmp/scan-test-dir"));
});

test("remove dir - sync", (t) => {
  removeDirSync("/tmp/scan-test-dir");

  t.false(existsSync("/tmp/scan-test-dir"));
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
