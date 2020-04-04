import test from "ava";
import { existsSync, statSync, unlinkSync, writeFileSync } from "./fs";
import { touch, touchSync } from "./touch";

const name = "/tmp/touch-test-file";

test.beforeEach(() => {
  try {
    unlinkSync(name);
  } catch (ex) {
    if (ex.code !== "ENOENT") {
      throw ex;
    }
  }
});

test.afterEach(() => {
  try {
    unlinkSync(name);
  } catch (ex) {
    if (ex.code !== "ENOENT") {
      throw ex;
    }
  }
});

test.serial(
  "with create new file option enabled on a missing file - async",
  async (t) => {
    t.true(await touch(name, { now: new Date(1000) }));

    t.is(statSync(name).mtimeMs, 1000);
  },
);

test.serial(
  "with create new file option enabled on a missing file - sync",
  (t) => {
    t.true(touchSync(name, { now: new Date(1000) }));

    t.is(statSync(name).mtimeMs, 1000);
  },
);

test.serial(
  "without create new file option enabled on a missing file - async",
  async (t) => {
    t.false(await touch(name, { create: false }));

    t.false(existsSync(name));
  },
);

test.serial(
  "without create new file option enabled on a missing file - sync",
  (t) => {
    t.false(touchSync(name, { create: false }));

    t.false(existsSync(name));
  },
);

test.serial(
  "with create new file option disabled on an existing file - async",
  async (t) => {
    writeFileSync(name, "something");

    t.true(await touch(name, { create: false, now: new Date(1000) }));

    t.is(statSync(name).mtimeMs, 1000);
  },
);

test.serial(
  "with create new file option disabled on an existing file - sync",
  (t) => {
    writeFileSync(name, "something");

    t.true(touchSync(name, { create: false, now: new Date(1000) }));

    t.is(statSync(name).mtimeMs, 1000);
  },
);
