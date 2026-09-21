import assert from "node:assert/strict";
import test from "node:test";
import { expandPathTemplate } from "./path.js";

test("expand path template", () => {
  assert.strictEqual(
    expandPathTemplate("[path].lock", "/var/lib/my-file.txt"),
    "/var/lib/my-file.txt.lock",
  );
  assert.strictEqual(
    expandPathTemplate("/run/lock/[path]", "/var/lib/my-file.txt"),
    "/run/lock//var/lib/my-file.txt",
  );
  assert.strictEqual(
    expandPathTemplate("/run/lock/[base].lock", "/var/lib/my-file.txt"),
    "/run/lock/my-file.txt.lock",
  );
  assert.strictEqual(
    expandPathTemplate("/run/lock/[name][ext].lock", "/var/lib/my-file.txt"),
    "/run/lock/my-file.txt.lock",
  );
  assert.strictEqual(
    expandPathTemplate("/run/lock/[name]-lock[ext]", "/var/lib/my-file.txt"),
    "/run/lock/my-file-lock.txt",
  );
  assert.strictEqual(
    expandPathTemplate("/run/lock/[hash]", "/var/lib/my-file.txt"),
    "/run/lock/49f30f4f6f29dac946c10832cd87cf3f",
  );
  assert.strictEqual(
    expandPathTemplate("/run/lock/[hash][ext]", "/var/lib/my-file.txt"),
    "/run/lock/49f30f4f6f29dac946c10832cd87cf3f.txt",
  );
  assert.strictEqual(
    expandPathTemplate("/run/lock/[slug]", "/var/lib/my-file.txt"),
    "/run/lock/~var~lib~my-file.txt",
  );
  assert.strictEqual(
    expandPathTemplate("/run/lock/[slug].lock", "/var/lib/my-file.txt"),
    "/run/lock/~var~lib~my-file.txt.lock",
  );
});

test("unknown path template param", () => {
  assert.throws(
    () => {
      expandPathTemplate("[omg]", "/var/lib/my-file.txt");
    },
    {
      message: "Unknown path template param [omg]",
    },
  );
  assert.throws(
    () => {
      expandPathTemplate("/[path]/[omg]", "/var/lib/my-file.txt");
    },
    {
      message: "Unknown path template param [omg]",
    },
  );
});
