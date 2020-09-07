import test from "ava";
import {
  existsSync,
  mkdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "./fs.js";
import { touch, touchSync } from "./touch.js";

test.beforeEach(() => {
  safeUnlinkSync("/tmp/touch-test-dir/touch-test-file");
  safeRmdirSync("/tmp/touch-test-dir");
});

test.afterEach(() => {
  safeUnlinkSync("/tmp/touch-test-dir/touch-test-file");
  safeRmdirSync("/tmp/touch-test-dir");
});

test.serial(
  "with create new file option enabled on a missing file - async",
  async (t) => {
    t.true(
      await touch("/tmp/touch-test-dir/touch-test-file", {
        now: new Date(1000),
      }),
    );

    t.is(statSync("/tmp/touch-test-dir/touch-test-file").mtimeMs, 1000);
  },
);

test.serial(
  "with create new file option enabled on a missing file - sync",
  (t) => {
    t.true(
      touchSync("/tmp/touch-test-dir/touch-test-file", {
        now: new Date(1000),
      }),
    );

    t.is(statSync("/tmp/touch-test-dir/touch-test-file").mtimeMs, 1000);
  },
);

test.serial(
  "without create new file option enabled on a missing file - async",
  async (t) => {
    t.false(
      await touch("/tmp/touch-test-dir/touch-test-file", {
        create: false,
      }),
    );

    t.false(existsSync("/tmp/touch-test-dir"));
    t.false(existsSync("/tmp/touch-test-dir/touch-test-file"));
  },
);

test.serial(
  "without create new file option enabled on a missing file - sync",
  (t) => {
    t.false(
      touchSync("/tmp/touch-test-dir/touch-test-file", { create: false }),
    );

    t.false(existsSync("/tmp/touch-test-dir"));
    t.false(existsSync("/tmp/touch-test-dir/touch-test-file"));
  },
);

test.serial(
  "with create new file option disabled on an existing file - async",
  async (t) => {
    mkdirSync("/tmp/touch-test-dir", { recursive: true });
    writeFileSync("/tmp/touch-test-dir/touch-test-file", "something");

    t.true(
      await touch("/tmp/touch-test-dir/touch-test-file", {
        create: false,
        now: new Date(1000),
      }),
    );

    t.is(statSync("/tmp/touch-test-dir/touch-test-file").mtimeMs, 1000);
  },
);

test.serial(
  "with create new file option disabled on an existing file - sync",
  (t) => {
    mkdirSync("/tmp/touch-test-dir", { recursive: true });
    writeFileSync("/tmp/touch-test-dir/touch-test-file", "something");

    t.true(
      touchSync("/tmp/touch-test-dir/touch-test-file", {
        create: false,
        now: new Date(1000),
      }),
    );

    t.is(statSync("/tmp/touch-test-dir/touch-test-file").mtimeMs, 1000);
  },
);

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
