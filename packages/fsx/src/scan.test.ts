import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import type { TestContext } from "node:test";
import test from "node:test";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
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

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "fsx-scan-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function populate(root: string): void {
  mkdirSync(join(root, "a", "1"), { recursive: true });
  mkdirSync(join(root, "b", "2"), { recursive: true });
  writeFileSync(join(root, "b", "2", "file1"), "something");
  symlinkSync("./file1", join(root, "b", "2", "file2"));
}

for (const [kind, scan, empty, remove] of [
  ["async", scanDir, emptyDir, removeDir],
  ["sync", scanDirSync, emptyDirSync, removeDirSync],
] as const) {
  test(`scans a missing directory - ${kind}`, async (t) => {
    const entries = [];
    for await (const entry of scan(join(fixture(t), "missing")))
      entries.push(entry);
    assert.deepEqual(entries, []);
  });

  test(`scans contents in pre-order - ${kind}`, async (t) => {
    const root = fixture(t);
    populate(root);
    const entries = [];
    for await (const entry of scan(root)) entries.push(entry);
    assert.equal(entries.length, 6);
    const byPath = new Map(entries.map((entry) => [entry.path, entry.stats]));
    for (const path of ["a", join("a", "1"), "b", join("b", "2")]) {
      assert.equal(byPath.get(path)?.isDirectory(), true);
    }
    assert.equal(byPath.get(join("b", "2", "file1"))?.isFile(), true);
    assert.equal(byPath.get(join("b", "2", "file2"))?.isSymbolicLink(), true);
    // Sibling order is unspecified; each parent must precede its descendants.
    const paths = entries.map((entry) => entry.path);
    for (const [parent, child] of [
      ["a", join("a", "1")],
      ["b", join("b", "2")],
      [join("b", "2"), join("b", "2", "file1")],
      [join("b", "2"), join("b", "2", "file2")],
    ]) {
      assert.ok(paths.indexOf(parent) < paths.indexOf(child));
    }
  });

  for (const replacement of ["missing", "symlink", "file"]) {
    test(`skips a directory replaced with ${replacement} while paused - ${kind}`, async (t) => {
      const root = fixture(t);
      const dir = join(root, "scan");
      const child = join(dir, "child");
      const outside = join(root, "outside");
      mkdirSync(child, { recursive: true });
      mkdirSync(outside);
      writeFileSync(join(outside, "keep"), "keep");
      let count = 0;
      for await (const entry of scan(dir)) {
        assert.equal(entry.path, "child");
        count++;
        rmSync(child, { recursive: true });
        if (replacement === "symlink") symlinkSync(outside, child, "dir");
        if (replacement === "file") writeFileSync(child, "replacement");
      }
      assert.equal(count, 1);
    });
  }

  test(`does not follow directory or dangling symlink entries - ${kind}`, async (t) => {
    const root = fixture(t);
    const dir = join(root, "scan");
    mkdirSync(dir);
    symlinkSync(root, join(dir, "loop"), "dir");
    symlinkSync(join(root, "missing"), join(dir, "dangling"));
    const entries = [];
    for await (const entry of scan(dir)) entries.push(entry);
    assert.equal(entries.length, 2);
    assert.ok(entries.every((entry) => entry.stats.isSymbolicLink()));
  });

  for (const [operation, run] of [
    [
      "scan",
      async (dir: string) => {
        for await (const entry of scan(dir)) void entry;
      },
    ],
    ["empty", empty],
    ["remove", remove],
  ] as const) {
    for (const trailing of ["", sep]) {
      test(`${operation} rejects a symlink root without modifying its target (trailing: ${!!trailing}) - ${kind}`, async (t) => {
        const root = fixture(t);
        const target = join(root, "target");
        const link = join(root, "link");
        mkdirSync(target);
        writeFileSync(join(target, "keep"), "keep");
        symlinkSync(target, link, "dir");
        await assert.rejects(async () => run(link + trailing), {
          code: "ENOTDIR",
        });
        assert.equal(readFileSync(join(target, "keep"), "utf8"), "keep");
        assert.equal(lstatSync(link).isSymbolicLink(), true);
      });
    }
    test(`${operation} rejects a regular file root - ${kind}`, async (t) => {
      const file = join(fixture(t), "file");
      writeFileSync(file, "keep");
      await assert.rejects(async () => run(file), { code: "ENOTDIR" });
      assert.equal(readFileSync(file, "utf8"), "keep");
    });
  }

  for (const [operation, run] of [
    ["empty", empty],
    ["remove", remove],
  ] as const) {
    test(`${operation} handles a missing directory - ${kind}`, async (t) => {
      const missing = join(fixture(t), "missing");
      await run(missing);
      assert.equal(existsSync(missing), false);
    });

    test(`${operation} removes nested contents and preserves symlink targets - ${kind}`, async (t) => {
      const root = fixture(t);
      const dir = join(root, "contents");
      populate(dir);
      const outside = join(root, "outside");
      mkdirSync(outside);
      writeFileSync(join(outside, "keep"), "keep");
      symlinkSync(outside, join(dir, "link"), "dir");
      symlinkSync(join(root, "missing"), join(dir, "dangling"));
      await run(dir);
      if (operation === "empty") assert.deepEqual(readdirSync(dir), []);
      else assert.equal(existsSync(dir), false);
      assert.equal(readFileSync(join(outside, "keep"), "utf8"), "keep");
    });
  }
}
