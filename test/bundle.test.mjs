import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

test("browser bundle includes one module identity for the art catalogue and its content sources", async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../src/app.mjs", import.meta.url))],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    charset: "utf8",
    legalComments: "none",
    minify: true,
    write: false,
    metafile: true,
  });
  const inputs = Object.keys(result.metafile.inputs).map((input) => input.replaceAll("\\", "/"));

  for (const moduleName of [
    "art-content.mjs",
    "content.mjs",
    "chapter-content.mjs",
    "character-content.mjs",
    "life-content.mjs",
    "night-content.mjs",
    "faction-content.mjs",
  ]) {
    const identities = inputs.filter((input) => input.match(new RegExp(`/${moduleName.replace(".", "\\.")}(?:\\?|$)`)));
    assert.equal(identities.length, 1, `${moduleName} bundle identities: ${identities.join(", ")}`);
  }
});
