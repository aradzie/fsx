import test from "ava";
import { expandPathTemplate } from "./path.js";

test("expand path template", (t) => {
  t.is(
    expandPathTemplate("[path].lock", "/var/lib/my-file.txt"),
    "/var/lib/my-file.txt.lock",
  );
  t.is(
    expandPathTemplate("/run/lock/[path]", "/var/lib/my-file.txt"),
    "/run/lock//var/lib/my-file.txt",
  );
  t.is(
    expandPathTemplate("/run/lock/[base].lock", "/var/lib/my-file.txt"),
    "/run/lock/my-file.txt.lock",
  );
  t.is(
    expandPathTemplate("/run/lock/[name][ext].lock", "/var/lib/my-file.txt"),
    "/run/lock/my-file.txt.lock",
  );
  t.is(
    expandPathTemplate("/run/lock/[name]-lock[ext]", "/var/lib/my-file.txt"),
    "/run/lock/my-file-lock.txt",
  );
  t.is(
    expandPathTemplate("/run/lock/[hash]", "/var/lib/my-file.txt"),
    "/run/lock/49f30f4f6f29dac946c10832cd87cf3f",
  );
  t.is(
    expandPathTemplate("/run/lock/[hash][ext]", "/var/lib/my-file.txt"),
    "/run/lock/49f30f4f6f29dac946c10832cd87cf3f.txt",
  );
  t.is(
    expandPathTemplate("/run/lock/[slug]", "/var/lib/my-file.txt"),
    "/run/lock/~var~lib~my-file.txt",
  );
  t.is(
    expandPathTemplate("/run/lock/[slug].lock", "/var/lib/my-file.txt"),
    "/run/lock/~var~lib~my-file.txt.lock",
  );
});

test("unknown path template param", (t) => {
  t.throws(
    () => {
      expandPathTemplate("[omg]", "/var/lib/my-file.txt");
    },
    {
      message: "Unknown path template param [omg]",
    },
  );
  t.throws(
    () => {
      expandPathTemplate("/[path]/[omg]", "/var/lib/my-file.txt");
    },
    {
      message: "Unknown path template param [omg]",
    },
  );
});
