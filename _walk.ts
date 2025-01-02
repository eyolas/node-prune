import { normalize } from "@std/path/normalize";
import { basename } from "@std/path/basename";
import { join } from "@std/path/join";

/**
 * Walk entry for {@linkcode walk}, {@linkcode walkSync},
 * {@linkcode expandGlob} and {@linkcode expandGlobSync}.
 */
export interface WalkEntry extends Deno.DirEntry {
  /** Full path of the entry. */
  path: string;
}

export async function createWalkEntry(path: string): Promise<WalkEntry> {
  path = normalize(path);
  const name = basename(path);
  const info = await Deno.stat(path);
  return {
    path,
    name,
    isFile: info.isFile,
    isDirectory: info.isDirectory,
    isSymlink: info.isSymlink,
  };
}

export async function* walk(root: string): AsyncIterableIterator<WalkEntry> {
  yield await createWalkEntry(root);

  for await (const entry of Deno.readDir(root)) {
    try {
      const path = join(root, entry.name);

      let { isSymlink, isDirectory } = entry;

      if (isSymlink) {
        try {
          const realPath = await Deno.realPath(path);
          // Caveat emptor: don't assume |path| is not a symlink. realpath()
          // resolves symlinks but another process can replace the file system
          // entity with a different type of entity before we call lstat().
          ({ isSymlink, isDirectory } = await Deno.lstat(realPath));
          yield* walk(realPath ?? path);
          yield { path, ...entry };
        } catch {
          // if the symlink is broken, just treat it as a file
          yield { path, ...entry };
        }
      } else if (isDirectory) {
        yield* walk(path);
      } else {
        yield { path, ...entry };
      }
      // deno-lint-ignore no-empty
    } catch {}
  }
}
