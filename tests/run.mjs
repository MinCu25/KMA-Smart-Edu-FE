import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(path.join(tmpdir(), "kma-contracts-"));
try {
  const outfile = path.join(dir, "test.mjs");
  await build({
    entryPoints: ["tests/contracts.ts"],
    bundle: true,
    banner: {js: 'import {createRequire as __testRequire} from "node:module"; const require=__testRequire(import.meta.url);'},
    platform: "node",
    format: "esm",
    outfile,
    define: { "import.meta.env.VITE_API_BASE_URL": '"http://test.invalid"' },
  });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(dir, { recursive: true, force: true });
}

