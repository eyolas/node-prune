import multimatch from "multimatch";
import { walk, type WalkEntry } from "./_walk.ts";
import {
  defaultDirectories,
  defaultExtensions,
  defaultFiles,
  defaultImagesDirectories,
} from "./_default.ts";

export type Stats = {
  filesTotal: number;
  filesRemoved: number;
  sizeRemoved: number;
};

export class Pruner {
  #dir: string = "node_modules";
  #dirs: string[] = defaultDirectories;
  #exts: string[] = defaultExtensions;
  #excepts: string[] = [];
  #globs: string[] = [];
  #files: string[] = defaultFiles;

  constructor() {}

  withDir(dir: string) {
    this.#dir = dir;
    return this;
  }

  withDirs(dirs: string[]) {
    this.#dirs.push(...dirs);
    return this;
  }

  withExts(exts: string[]) {
    this.#exts.push(...exts);
    return this;
  }

  withExcepts(excepts: string[]) {
    this.#excepts.push(...excepts);
    return this;
  }

  withGlobs(globs: string[]) {
    this.#globs.push(...globs);
    return this;
  }

  withFiles(files: string[]) {
    this.#files.push(...files);
    return this;
  }

  withImages() {
    this.#dirs.push(...defaultImagesDirectories);
    return this;
  }

  async prune() {
    const pruneStats: Stats = {
      filesTotal: 0,
      filesRemoved: 0,
      sizeRemoved: 0,
    };

    for await (const entry of walk(this.#dir)) {
      const entryStats = await Deno.lstat(entry.path);
      pruneStats.filesTotal++;
      if (!this.#mustPrune(entry)) {
        continue;
      }

      pruneStats.filesRemoved++;
      pruneStats.sizeRemoved += entryStats.size;

      if (entry.isDirectory) {
        const stats = await dirStats(entry.path);
        pruneStats.filesRemoved += stats.filesRemoved;
        pruneStats.sizeRemoved += stats.sizeRemoved;
        pruneStats.filesTotal += stats.filesTotal;
        await Deno.remove(entry.path, { recursive: true });
      } else {
        await Deno.remove(entry.path);
      }
    }

    return pruneStats;
  }

  #mustPrune(file: WalkEntry): boolean {
    if (multimatch([file.path, file.name], this.#excepts).length > 0) {
      return false;
    }

    if (multimatch([file.path, file.name], this.#globs).length > 0) {
      return true;
    }

    if (file.isDirectory) {
      return this.#dirs.includes(file.name);
    }

    if (this.#files.includes(file.name)) {
      return true;
    }

    if (this.#files.includes(file.path)) {
      return true;
    }

    const ext = file.name.split(".").pop();
    if (!ext) {
      return false;
    }
    return this.#exts.includes(ext);
  }
}

async function dirStats(path: string) {
  const stats = {
    filesTotal: 0,
    filesRemoved: 0,
    sizeRemoved: 0,
  };

  for await (const entry of walk(path)) {
    const entryStats = await Deno.lstat(entry.path);
    stats.filesTotal++;
    if (entry.isDirectory) {
      continue;
    }
    stats.filesRemoved++;
    stats.sizeRemoved += entryStats.size;
  }

  return stats;
}
