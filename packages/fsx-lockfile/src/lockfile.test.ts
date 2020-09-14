import { Dir, File } from "@aradzie/fsx-file";
import { fixedDelay, RetryOptions } from "@aradzie/retry";
import test from "ava";
import { LockFile, LockFileError, LockFileState } from "./lockfile.js";

const root = new Dir("/tmp/test-fs-lockfile");
const file = new File("/tmp/test-fs-lockfile/file");
const lock = new File("/tmp/test-fs-lockfile/file.lock");

test.beforeEach(async () => {
  await root.remove();
});

test.afterEach(async () => {
  await root.remove();
});

test.serial("lock unlock lock", async (t) => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  // Assert.

  await t.notThrowsAsync(async () => {
    await (await LockFile.lock(file, options)).rollback();
    await (await LockFile.lock(file, options)).commit();
    await (await LockFile.lock(file, options)).rollback();
  });
});

test.serial("fail to lock", async (t) => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 3,
    delayer: fixedDelay(1),
  };
  const lockFile = await LockFile.lock(file, options);

  // Assert.

  try {
    await t.throwsAsync<LockFileError>(
      async () => {
        await LockFile.lock(file, options);
      },
      {
        instanceOf: LockFileError,
      },
    );
  } finally {
    await lockFile.rollback();
  }
});

test.serial("detect unlocked status", async (t) => {
  // Assert.

  t.is(await LockFile.isLocked(file), "unlocked");
});

test.serial("detect locked status", async (t) => {
  // Arrange.

  await lock.touch();

  // Assert.

  t.is(await LockFile.isLocked(file), "locked");
});

test.serial("detect stale status", async (t) => {
  // Arrange.

  await lock.touch({ now: new Date(0) });

  // Assert.

  t.is(await LockFile.isLocked(file), "stale");
});

test.serial("delete stale lock file", async (t) => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await lock.touch({ now: new Date(0) });

  // Act.

  await (await LockFile.lock(file, options)).rollback();

  // Assert.

  t.is(await LockFile.isLocked(file), "unlocked");
  t.false(await file.exists());
  t.false(await lock.exists());
});

test.serial("unlock", async (t) => {
  // Arrange.

  await lock.touch();

  // Act.

  await LockFile.forceUnlock(file);

  // Assert.

  t.is(await LockFile.isLocked(file), "unlocked");
  t.false(await file.exists());
  t.false(await lock.exists());
});

test.serial("commit for missing file", async (t) => {
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

  t.is(lockFile.state, LockFileState.COMMITTED);
  t.is(await LockFile.isLocked(file), "unlocked");
  t.true(await file.exists());
  t.false(await lock.exists());
  t.is(await file.read("utf8"), "updated");
});

test.serial("commit for existing file", async (t) => {
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

  t.is(lockFile.state, LockFileState.COMMITTED);
  t.is(await LockFile.isLocked(file), "unlocked");
  t.true(await file.exists());
  t.false(await lock.exists());
  t.is(await file.read("utf8"), "updated");
});

test.serial("rollback for missing file", async (t) => {
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

  t.is(lockFile.state, LockFileState.ABORTED);
  t.is(await LockFile.isLocked(file), "unlocked");
  t.false(await file.exists());
  t.false(await lock.exists());
});

test.serial("rollback for existing file", async (t) => {
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

  t.is(lockFile.state, LockFileState.ABORTED);
  t.is(await LockFile.isLocked(file), "unlocked");
  t.true(await file.exists());
  t.false(await lock.exists());
  t.is(await file.read("utf8"), "original");
});

test.serial("check state", async (t) => {
  // Arrange.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };
  const lockFile = await LockFile.lock(file, options);
  await lockFile.rollback();

  // Assert.

  await t.throwsAsync(async () => {
    await lockFile.writeFile("something");
  });
  await t.throwsAsync(async () => {
    await lockFile.appendFile("something");
  });
  await t.throwsAsync(async () => {
    await lockFile.commit();
  });
  await t.throwsAsync(async () => {
    await lockFile.rollback();
  });
});

test.serial("withLock automatically commits on success", async (t) => {
  // Act.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await LockFile.withLock(file, options, async (lock) => {
    await lock.writeFile("something");
  });

  // Assert.

  t.is(await LockFile.isLocked(file), "unlocked");
  t.is(await file.read("utf8"), "something");
});

test.serial("withLock automatically rollbacks on error", async (t) => {
  // Arrange.

  await file.write("something");

  // Act.

  const options: RetryOptions = {
    retryLimit: 1,
    delayer: fixedDelay(1),
  };

  await t.throwsAsync(async () => {
    await LockFile.withLock(file, options, async (lock) => {
      await lock.writeFile("fixed");
      throw new Error("whoops");
    });
  });

  // Assert.

  t.is(await LockFile.isLocked(file), "unlocked");
  t.is(await file.read("utf8"), "something");
});

test.serial("withLock honors commit", async (t) => {
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

  t.is(await LockFile.isLocked(file), "unlocked");
  t.is(await file.read("utf8"), "fixed");
});

test.serial("withLock honors rollback", async (t) => {
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

  t.is(await LockFile.isLocked(file), "unlocked");
  t.is(await file.read("utf8"), "something");
});
