import fs from "fs";
import util from "util";

export {
  constants,
  createReadStream,
  createWriteStream,
  Dir,
  Dirent,
  FSWatcher,
  PathLike,
  promises,
  ReadStream,
  Stats,
  WriteStream,
} from "fs";

export const access = util.promisify(fs.access);
export const accessSync = fs.accessSync;
export const appendFile = util.promisify(fs.appendFile);
export const appendFileSync = fs.appendFileSync;
export const chmod = util.promisify(fs.chmod);
export const chmodSync = fs.chmodSync;
export const chown = util.promisify(fs.chown);
export const chownSync = fs.chownSync;
export const close = util.promisify(fs.close);
export const closeSync = fs.closeSync;
export const copyFile = util.promisify(fs.copyFile);
export const copyFileSync = fs.copyFileSync;
export const exists = util.promisify(fs.exists); // eslint-disable-line node/no-deprecated-api
export const existsSync = fs.existsSync;
export const fchmod = util.promisify(fs.fchmod);
export const fchmodSync = fs.fchmodSync;
export const fchown = util.promisify(fs.fchown);
export const fchownSync = fs.fchownSync;
export const fdatasync = util.promisify(fs.fdatasync);
export const fdatasyncSync = fs.fdatasyncSync;
export const fstat = util.promisify(fs.fstat);
export const fstatSync = fs.fstatSync;
export const fsync = util.promisify(fs.fsync);
export const fsyncSync = fs.fsyncSync;
export const ftruncate = util.promisify(fs.ftruncate);
export const ftruncateSync = fs.ftruncateSync;
export const futimes = util.promisify(fs.futimes);
export const futimesSync = fs.futimesSync;
export const lchown = util.promisify(fs.lchown);
export const lchownSync = fs.lchownSync;
export const link = util.promisify(fs.link);
export const linkSync = fs.linkSync;
export const lstat = util.promisify(fs.lstat);
export const lstatSync = fs.lstatSync;
export const mkdir = util.promisify(fs.mkdir);
export const mkdirSync = fs.mkdirSync;
export const mkdtemp = util.promisify(fs.mkdtemp);
export const mkdtempSync = fs.mkdtempSync;
export const open = util.promisify(fs.open);
export const openSync = fs.openSync;
export const opendir = util.promisify(fs.opendir);
export const opendirSync = fs.opendirSync;
export const read = util.promisify(fs.read);
export const readSync = fs.readSync;
export const readdir = util.promisify(fs.readdir);
export const readdirSync = fs.readdirSync;
export const readFile = util.promisify(fs.readFile);
export const readFileSync = fs.readFileSync;
export const readlink = util.promisify(fs.readlink);
export const readlinkSync = fs.readlinkSync;
export const realpath = util.promisify(fs.realpath);
export const realpathSync = fs.realpathSync;
export const rename = util.promisify(fs.rename);
export const renameSync = fs.renameSync;
export const rmdir = util.promisify(fs.rmdir);
export const rmdirSync = fs.rmdirSync;
export const stat = util.promisify(fs.stat);
export const statSync = fs.statSync;
export const symlink = util.promisify(fs.symlink);
export const symlinkSync = fs.symlinkSync;
export const truncate = util.promisify(fs.truncate);
export const truncateSync = fs.truncateSync;
export const unlink = util.promisify(fs.unlink);
export const unlinkSync = fs.unlinkSync;
export const unwatchFile = fs.unwatchFile;
export const utimes = util.promisify(fs.utimes);
export const utimesSync = fs.utimesSync;
export const watch = fs.watch;
export const watchFile = fs.watchFile;
export const write = util.promisify(fs.write);
export const writeSync = fs.writeSync;
export const writeFile = util.promisify(fs.writeFile);
export const writeFileSync = fs.writeFileSync;
export const writev = util.promisify(fs.writev);
export const writevSync = fs.writevSync;
