import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  existsSync,
  mkdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "./fs.js";
import { touch, touchSync } from "./touch.js";

beforeEach(() => {
  safeUnlinkSync("/tmp/touch-test-dir/touch-test-file");
  safeRmdirSync("/tmp/touch-test-dir");
});

afterEach(() => {
  safeUnlinkSync("/tmp/touch-test-dir/touch-test-file");
  safeRmdirSync("/tmp/touch-test-dir");
});

test("with create new file option enabled on a missing file - async", async () => {
  assert.strictEqual(
    await touch("/tmp/touch-test-dir/touch-test-file", {
      now: new Date(1000),
    }),
    true,
  );

  assert.strictEqual(
    statSync("/tmp/touch-test-dir/touch-test-file").mtimeMs,
    1000,
  );
});

test("with create new file option enabled on a missing file - sync", () => {
  assert.strictEqual(
    touchSync("/tmp/touch-test-dir/touch-test-file", {
      now: new Date(1000),
    }),
    true,
  );

  assert.strictEqual(
    statSync("/tmp/touch-test-dir/touch-test-file").mtimeMs,
    1000,
  );
});

test("without create new file option enabled on a missing file - async", async () => {
  assert.strictEqual(
    await touch("/tmp/touch-test-dir/touch-test-file", {
      create: false,
    }),
    false,
  );

  assert.strictEqual(existsSync("/tmp/touch-test-dir"), false);
  assert.strictEqual(existsSync("/tmp/touch-test-dir/touch-test-file"), false);
});

test("without create new file option enabled on a missing file - sync", () => {
  assert.strictEqual(
    touchSync("/tmp/touch-test-dir/touch-test-file", { create: false }),
    false,
  );

  assert.strictEqual(existsSync("/tmp/touch-test-dir"), false);
  assert.strictEqual(existsSync("/tmp/touch-test-dir/touch-test-file"), false);
});

test("with create new file option disabled on an existing file - async", async () => {
  mkdirSync("/tmp/touch-test-dir", { recursive: true });
  writeFileSync("/tmp/touch-test-dir/touch-test-file", "something");

  assert.strictEqual(
    await touch("/tmp/touch-test-dir/touch-test-file", {
      create: false,
      now: new Date(1000),
    }),
    true,
  );

  assert.strictEqual(
    statSync("/tmp/touch-test-dir/touch-test-file").mtimeMs,
    1000,
  );
});

test("with create new file option disabled on an existing file - sync", () => {
  mkdirSync("/tmp/touch-test-dir", { recursive: true });
  writeFileSync("/tmp/touch-test-dir/touch-test-file", "something");

  assert.strictEqual(
    touchSync("/tmp/touch-test-dir/touch-test-file", {
      create: false,
      now: new Date(1000),
    }),
    true,
  );

  assert.strictEqual(
    statSync("/tmp/touch-test-dir/touch-test-file").mtimeMs,
    1000,
  );
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
