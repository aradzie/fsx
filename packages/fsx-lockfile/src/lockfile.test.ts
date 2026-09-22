import assert from "node:assert/strict";
import { relative } from "node:path";
import test, { afterEach, beforeEach } from "node:test";
import { symlink } from "@sosimple/fsx";
import { Dir, File } from "@sosimple/fsx-file";
import type { RetryOptions } from "@sosimple/retry";
import { fixedDelay } from "@sosimple/retry";
import { LockFile, LockFileError, LockFileState } from "./lockfile.js";

const root = new Dir("/tmp/test-fs-lockfile");
const file = new File("/tmp/test-fs-lockfile/file");
const lock = new File("/tmp/test-fs-lockfile/file.lock");

beforeEach(async () => {
  await root.remove();
});

afterEach(async () => {
  await root.remove();
});

test("lock unlock lock", async () => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  // Assert.

  await assert.doesNotReject(async () => {
    await (await LockFile.lock(file, options)).rollback();
    await (await LockFile.lock(file, options)).commit();
    await (await LockFile.lock(file, options)).rollback();
  });
});

test("fail to lock", async () => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 3,
    delayer: fixedDelay(1),
  };
  const lockFile = await LockFile.lock(file, options);

  // Assert.

  try {
    await assert.rejects(async () => {
      await LockFile.lock(file, options);
    }, LockFileError);
  } finally {
    await lockFile.rollback();
  }
});

test("detect unlocked status", async () => {
  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
});

test("detect locked status", async () => {
  // Arrange.

  await lock.touch();

  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "locked");
});

test("detect stale status", async () => {
  // Arrange.

  await lock.touch({ now: new Date(0) });

  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "stale");
});

test("delete stale lock file", async () => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await lock.touch({ now: new Date(0) });

  // Act.

  await (await LockFile.lock(file, options)).rollback();

  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.exists(), false);
  assert.strictEqual(await lock.exists(), false);
});

test("unlock", async () => {
  // Arrange.

  await lock.touch();

  // Act.

  await LockFile.forceUnlock(file);

  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.exists(), false);
  assert.strictEqual(await lock.exists(), false);
});

test("reject lock paths that resolve to the target", async () => {
  const real = new Dir(`${root.path}/real`);
  const alias = new Dir(`${root.path}/alias`);
  const target = new File(`${real.path}/file`);
  await target.write("original");
  await target.touch({ now: new Date(0) });
  await symlink(real.path, alias.path, "dir");

  const unsafeLockNames = [
    "[dir]/./[base]",
    "[dir]/child/../[base]",
    "[dir]//[base]",
    relative(process.cwd(), target.path),
    `${alias.path}/[base]`,
  ];

  for (const lockName of unsafeLockNames) {
    const options = { lockName, retryLimit: 1, delayer: fixedDelay(1) };
    const expected = { message: "Lock name is the same as file name." };

    await assert.rejects(LockFile.lock(target, options), expected);
    await assert.rejects(LockFile.isLocked(target, options), expected);
    await assert.rejects(LockFile.forceUnlock(target, options), expected);
    assert.strictEqual(await target.read("utf8"), "original");
  }
});

test("commit for missing file", async () => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  // Act.

  const lockFile = await LockFile.lock(file, options);
  await lockFile.writeFile("updated");
  await lockFile.commit();

  // Assert.

  assert.strictEqual(lockFile.state, LockFileState.COMMITTED);
  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.exists(), true);
  assert.strictEqual(await lock.exists(), false);
  assert.strictEqual(await file.read("utf8"), "updated");
});

test("commit for existing file", async () => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await file.write("original");

  // Act.

  const lockFile = await LockFile.lock(file, options);
  await lockFile.writeFile("updated");
  await lockFile.commit();

  // Assert.

  assert.strictEqual(lockFile.state, LockFileState.COMMITTED);
  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.exists(), true);
  assert.strictEqual(await lock.exists(), false);
  assert.strictEqual(await file.read("utf8"), "updated");
});

test("rollback for missing file", async () => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  // Act.

  const lockFile = await LockFile.lock(file, options);
  await lockFile.writeFile("content");
  await lockFile.rollback();

  // Assert.

  assert.strictEqual(lockFile.state, LockFileState.ABORTED);
  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.exists(), false);
  assert.strictEqual(await lock.exists(), false);
});

test("rollback for existing file", async () => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await file.write("original");

  // Act.

  const lockFile = await LockFile.lock(file, options);
  await lockFile.writeFile("updated");
  await lockFile.rollback();

  // Assert.

  assert.strictEqual(lockFile.state, LockFileState.ABORTED);
  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.exists(), true);
  assert.strictEqual(await lock.exists(), false);
  assert.strictEqual(await file.read("utf8"), "original");
});

test("check state", async () => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };
  const lockFile = await LockFile.lock(file, options);
  await lockFile.rollback();

  // Assert.

  await assert.rejects(async () => {
    await lockFile.writeFile("something");
  });
  await assert.rejects(async () => {
    await lockFile.appendFile("something");
  });
  await assert.rejects(async () => {
    await lockFile.commit();
  });
  await assert.rejects(async () => {
    await lockFile.rollback();
  });
});

test("withLock automatically commits on success", async () => {
  // Act.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await LockFile.withLock(file, options, async (lock) => {
    await lock.writeFile("something");
  });

  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.read("utf8"), "something");
});

test("withLock automatically rollbacks on error", async () => {
  // Arrange.

  await file.write("something");

  // Act.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await assert.rejects(async () => {
    await LockFile.withLock(file, options, async (lock) => {
      await lock.writeFile("fixed");
      throw new Error("whoops");
    });
  });

  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.read("utf8"), "something");
});

test("withLock honors commit", async () => {
  // Arrange.

  await file.write("something");

  // Act.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await LockFile.withLock(file, options, async (lock) => {
    await lock.writeFile("fixed");
    await lock.commit();
  });

  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.read("utf8"), "fixed");
});

test("withLock honors rollback", async () => {
  // Arrange.

  await file.write("something");

  // Act.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await LockFile.withLock(file, options, async (lock) => {
    await lock.writeFile("fixed");
    await lock.rollback();
  });

  // Assert.

  assert.strictEqual(await LockFile.isLocked(file), "unlocked");
  assert.strictEqual(await file.read("utf8"), "something");
});
