import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { TestContext } from "node:test";
import test from "node:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "./fs.js";
import { touch, touchSync } from "./touch.js";

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "fsx-touch-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return join(root, "nested", "file");
}

for (const [kind, run] of [
  ["async", touch],
  ["sync", touchSync],
] as const) {
  test(`creates a missing file and its parents - ${kind}`, async (t) => {
    const file = fixture(t);
    assert.equal(await run(file, { now: new Date(1000) }), true);
    assert.equal(statSync(file).mtimeMs, 1000);
    assert.equal(statSync(file).atimeMs, 1000);
    assert.equal(readFileSync(file, "utf8"), "");
  });

  for (const parentExists of [false, true]) {
    test(`create:false leaves a missing file absent (parent exists: ${parentExists}) - ${kind}`, async (t) => {
      const file = fixture(t);
      if (parentExists) mkdirSync(dirname(file));
      assert.equal(await run(file, { create: false }), false);
      assert.equal(existsSync(file), false);
      assert.equal(existsSync(dirname(file)), parentExists);
    });
  }

  for (const create of [undefined, false]) {
    test(`preserves existing contents (create: ${create}) - ${kind}`, async (t) => {
      const file = fixture(t);
      mkdirSync(dirname(file));
      writeFileSync(file, "something");
      assert.equal(await run(file, { create, now: new Date(1000) }), true);
      assert.equal(statSync(file).mtimeMs, 1000);
      assert.equal(statSync(file).atimeMs, 1000);
      assert.equal(readFileSync(file, "utf8"), "something");
    });

    test(`updates an owned read-only file (create: ${create}) - ${kind}`, async (t) => {
      const file = fixture(t);
      mkdirSync(dirname(file));
      writeFileSync(file, "something");
      chmodSync(file, 0o444);
      try {
        assert.equal(await run(file, { create, now: new Date(1000) }), true);
        assert.equal(statSync(file).mtimeMs, 1000);
        assert.equal(readFileSync(file, "utf8"), "something");
      } finally {
        chmodSync(file, 0o600);
      }
    });
  }

  test(`propagates errors other than ENOENT - ${kind}`, async (t) => {
    const file = fixture(t);
    writeFileSync(dirname(file), "not a directory");
    await assert.rejects(async () => run(file), { code: "ENOTDIR" });
  });

  test(`closes the descriptor when setting timestamps fails - ${kind}`, (t) => {
    const file = fixture(t);
    // Import the module in a fresh process so fs.ts captures the injected fs functions.
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
        import assert from "node:assert/strict";
        import fs from "node:fs";
        const failure = Object.assign(new Error("injected failure"), { code: "EIO" });
        let descriptor;
        fs.futimes = (fd, atime, mtime, callback) => {
          descriptor = fd;
          callback(failure);
        };
        fs.futimesSync = (fd) => {
          descriptor = fd;
          throw failure;
        };
        const { touch, touchSync } = await import(${JSON.stringify(new URL("./touch.js", import.meta.url).href)});
        const run = ${kind === "async" ? "touch" : "touchSync"};
        await assert.rejects(async () => run(${JSON.stringify(file)}), (err) => err === failure);
        assert.equal(typeof descriptor, "number");
        assert.throws(() => fs.fstatSync(descriptor), { code: "EBADF" });
      `,
      ],
      { stdio: "inherit" },
    );
  });
}
