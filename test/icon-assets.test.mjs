import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditIconAssets } from "../scripts/icon-assets.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("icon assets match required dimensions and every offline reference", async () => {
  const report = await auditIconAssets(root);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.dimensions, {
    "icon-master.png": [1024, 1024],
    "icon-512.png": [512, 512],
    "icon-maskable-512.png": [512, 512],
    "icon-192.png": [192, 192],
    "apple-touch-icon.png": [180, 180],
    "favicon-32.png": [32, 32],
  });
});

test("service worker publishes the replacement logo in a fresh offline cache", async () => {
  const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  const version = source.match(/const CACHE = "crime-five-roads-v(\d+)";/);
  assert.ok(version, "service-worker cache version must be discoverable");
  assert.ok(Number(version[1]) >= 47, `expected cache v47 or newer, got v${version[1]}`);

  for (const name of [
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-512.png",
    "apple-touch-icon.png",
    "favicon-32.png",
  ]) {
    assert.match(source, new RegExp(name.replace(".", "\\.")));
  }
});
