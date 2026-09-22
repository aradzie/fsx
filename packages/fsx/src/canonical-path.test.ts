import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import type { TestContext } from "node:test";
import test from "node:test";
import { canonicalPath, canonicalPathSync } from "./canonical-path.js";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "./fs.js";

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "fsx-canonical-path-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

for (const [kind, run] of [
  ["async", canonicalPath],
  ["sync", canonicalPathSync],
] as const) {
  test(`resolves an existing symbolic link - ${kind}`, async (t) => {
    const root = fixture(t);
    const real = join(root, "real");
    const alias = join(root, "alias");
    const file = join(real, "file");
    mkdirSync(real);
    writeFileSync(file, "content");
    symlinkSync(real, alias, "dir");

    assert.equal(await run(join(alias, "file")), file);
  });

  test(`resolves symlinks in the existing prefix of a missing path - ${kind}`, async (t) => {
    const root = fixture(t);
    const real = join(root, "real");
    const alias = join(root, "alias");
    mkdirSync(real);
    symlinkSync(real, alias, "dir");

    assert.equal(
      await run(join(alias, "missing", "file")),
      join(real, "missing", "file"),
    );
  });

  test(`returns an absolute normalized path - ${kind}`, async (t) => {
    const root = fixture(t);
    const input = relative(process.cwd(), join(root, "missing", "..", "file"));

    assert.equal(await run(input), resolve(root, "file"));
  });
}
