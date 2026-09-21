# FileSystem Extra

A collection of packages which extend the node's `fs` module in various ways.

* [FSX](./packages/fsx) &mdash; Re-exports promisified versions of the functions from the `fs` module, plus few extra utility functions, such as `scanDir`, `emptyDir`, `touch`, etc.
* [FSX File](./packages/fsx-file) &mdash; A library of classes which wrap the node's `fs` module and provide a higher-level object-oriented API around it.
* [FSX LockFile](./packages/fsx-lockfile) &mdash; A lock file library which allows multiple concurrent processes to safely update shared files.
* [Retry](./packages/retry) &mdash; A library for retrying failed I/O operations.

## Development

Run `npm install` at the repository root to install dependencies and link the packages.
Use `npm run compile` to compile all packages, `npm test` to compile and test them,
and `npm run clean` to remove compiled output.

These commands use npm workspaces. The `workspaces` array in `package.json` lists
packages in dependency order because npm runs workspace scripts in that order.
Keep dependencies before their dependents when adding or reordering packages.
