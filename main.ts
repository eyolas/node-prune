import { Command } from "@cliffy/command";
import { Pruner } from "./_pruner.ts";
import { format } from "@std/fmt/bytes";
import { osLocale } from "os-locale";
import { format as duration } from "@std/fmt/duration";

await new Command()
  .name("node-prune")
  .option(
    "-e, --exclude <exclude:string[]>",
    "Glob of files that should not be pruned. Comma separated list of exclude.",
  )
  .option(
    "-i, --include <include:string[]>",
    "Globs of files that should always be pruned in addition to the defaults. Comma separated list of include.",
  )
  .option(
    "-f, --files <files:string[]>",
    "Files that should always be pruned. Comma separated list of files.",
  )
  .option(
    "-img, --images",
    "Prune images (add images and assets to the list of directories to prune).",
  )
  .arguments("[dir:string]")
  .action(async ({ exclude, include, files, images }, dir) => {
    const start = performance.now();
    const pruner = new Pruner();
    if (dir) {
      pruner.withDir(dir);
    }

    if (exclude) {
      pruner.withExcepts(exclude);
    }

    if (include) {
      pruner.withGlobs(include);
    }

    if (files) {
      pruner.withFiles(files);
    }

    if (images) {
      pruner.withImages();
    }

    const locale = await osLocale();
    const nf = new Intl.NumberFormat(locale);

    const stats = await pruner.prune();
    console.log("files total", nf.format(stats.filesTotal));
    console.log("files removed", nf.format(stats.filesRemoved));
    console.log("size removed", format(stats.sizeRemoved));
    console.log(
      "duration",
      duration(start - performance.now(), { ignoreZero: true }),
    );
  })
  .parse(Deno.args);
