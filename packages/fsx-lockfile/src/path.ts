import { createHash } from "crypto";
import { parse } from "path";

export function expandPathTemplate(template: string, path: string): string {
  if (template === "[path].lock") {
    return path + ".lock";
  }
  const { root, dir, base, name, ext } = parse(path);
  let hash: string | null = null;
  let slug: string | null = null;
  return template.replace(/\[[a-z]+\]/g, (param) => {
    switch (param) {
      case "[path]":
        return path;
      case "[root]":
        return root;
      case "[dir]":
        return dir;
      case "[base]":
        return base;
      case "[name]":
        return name;
      case "[ext]":
        return ext;
      case "[hash]":
        return (hash ??= computeHash(path));
      case "[slug]":
        return (slug ??= computeSlug(path));
    }
    throw new Error(`Unknown path template param ${param}`);
  });
}

function computeHash(path: string): string {
  return createHash("md5").update(path).digest("hex");
}

function computeSlug(path: string): string {
  return path.replace(/[\\/]/g, "~");
}
