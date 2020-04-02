/**
 * File read flag values.
 */
export type ReadFlag =
  | "r" // Open file for reading. An exception occurs if the file does not exist.
  | "r+"; // Open file for reading and writing. An exception occurs if the file does not exist.

/**
 * File append flag values.
 */
export type AppendFlag =
  | "a" // Open file for appending. The file is created if it does not exist.
  | "ax" // Like 'a' but fails if the path exists.
  | "a+" // Open file for reading and appending. The file is created if it does not exist.
  | "ax+"; // Like 'a+' but fails if the path exists.

/**
 * File write flag values.
 */
export type WriteFlag =
  | AppendFlag
  | "w" // Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
  | "wx" // Like 'w' but fails if the path exists.
  | "w+" // Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
  | "wx+"; // Like 'w+' but fails if the path exists.

/**
 * Data encoding.
 */
export type Encoding = "utf8" | "base64" | "hex" | "binary";

/**
 * File read options.
 */
export interface ReadOptions {
  readonly flag?: ReadFlag;
  readonly encoding?: Encoding;
}

/**
 * File append options.
 */
export interface AppendOptions {
  readonly mode?: number;
  readonly flag?: AppendFlag;
  readonly encoding?: Encoding;
}

/**
 * File write options.
 */
export interface WriteOptions {
  readonly mode?: number;
  readonly flag?: WriteFlag;
  readonly encoding?: Encoding;
}

export interface ReadJsonOptions extends ReadOptions {
  readonly reviver?: (key: any, value: any) => any;
}

export interface WriteJsonOptions extends WriteOptions {
  readonly replacer?: (key: string, value: any) => any;
  readonly space?: string | number;
}
