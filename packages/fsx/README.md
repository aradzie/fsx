# FileSystem Extra

Re-exports promisified versions of the functions from the node's `fs` module,
plus a few extra utility functions, such as `scanDir`, `emptyDir`, `touch`, etc.

`canonicalPath` and `canonicalPathSync` return an absolute, normalized path
after resolving symbolic links in its longest existing prefix, so the final
path does not need to exist. They do not provide a stable filesystem identity:
hard links, bind mounts, case aliases, and concurrent filesystem changes can
still make different paths refer to the same entry or change what a path refers
to.
