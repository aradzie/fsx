# Lock File

A lock file library which allows multiple concurrent processes to safely update
shared files.

## Path requirements

This package intentionally does not resolve symbolic links. Every process must
use the same canonical target path for all lockfile operations and ordinary
file access. The target path and the path produced by `lockName` must not
contain symbolic links.

When an input path may contain symbolic links, call `canonicalPath` from
`@sosimple/fsx` once, then reuse the resulting path or `File` for `lock()`,
`isLocked()`, `forceUnlock()`, and `withLock()`:

```ts
import { canonicalPath } from "@sosimple/fsx";
import { File } from "@sosimple/fsx-file";
import { LockFile } from "@sosimple/fsx-lockfile";

const file = new File(await canonicalPath(inputPath));

await LockFile.withLock(file, options, async (lock) => {
  // Read through file and stage updates through lock.
});
```

The caller must also ensure that custom lock directories used by `lockName` do
not contain symbolic links. Hard links, bind mounts, filesystem case aliases,
and concurrent changes to the path hierarchy can still give one filesystem
entry multiple identities. Using such aliases, changing the selected path, or
passing paths containing unresolved symbolic links results in undefined
behavior and can break mutual exclusion or modify the wrong filesystem entry.
