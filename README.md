# FileSystem Extra

A collection of packages which extend the node's `fs` module in various ways.

* [FSX](./packages/fsx) &mdash; Re-exports promisified versions of the functions from the `fs` module, plus few extra utility functions, such as `scanDir`, `emptyDir`, `touch`, etc.
* [File](./packages/fsx-file) &mdash; A library of classes which wrap the node's `fs` module and provide a higher-level object-oriented API around it.
* [LockFile](./packages/fsx-lockfile) &mdash; A lock file library which allows multiple concurrent processes to safely update shared files.
* [Retry](./packages/retry) &mdash; A library for retrying failed I/O operations.
