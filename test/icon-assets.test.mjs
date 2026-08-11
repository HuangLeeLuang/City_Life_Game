import test from "node:test";
import assert from "node:assert/strict";
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
