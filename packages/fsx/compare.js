/*
 * Compares the list of names exported from this package
 * with the list of names exported from node's "fs".
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const their = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const our = require("./lib");

const theirKeys = new Set(Object.keys(their).sort());
const ourKeys = new Set(Object.keys(our).sort());

for (const item of theirKeys) {
  if (!ourKeys.has(item)) {
    console.log("missing key", item);
  }
}

for (const item of ourKeys) {
  if (!theirKeys.has(item)) {
    console.log("extra key", item);
  }
}
