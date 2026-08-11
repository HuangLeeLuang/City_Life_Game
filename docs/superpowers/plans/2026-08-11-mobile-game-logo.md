# Mobile Game Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overly detailed phone-and-bridge mobile icon with a small-size-readable harbor-city faction emblem across PWA, Apple Touch, and favicon outputs.

**Architecture:** Generate one approved 1024×1024 opaque master using the imagegen skill, derive every platform size from that master with one deterministic Pillow script, and verify dimensions/manifest/cache references with a Node audit. Keep all existing icon filenames so HTML and manifest structure remain stable.

**Tech Stack:** imagegen skill and image generation tool, PNG, bundled Python with Pillow, Node.js built-in test runner, Web App Manifest, service worker, in-app browser visual QA.

## Global Constraints

- The emblem contains a simplified harbor skyline/bridge, exactly five converging gold faction roads, and one red warning node.
- No text, numbers, people, faces, guns, crosshairs, watermarks, tiny windows, rain streaks, cables, or scratch textures.
- The image uses an opaque near-black/deep-teal full-bleed background.
- The primary emblem remains inside the central 66% maskable safe zone.
- Outputs are exactly 1024, 512, maskable 512, 192, Apple Touch 180, and favicon 32 pixels square.
- The favicon may receive only contrast/sharpening adjustments; its geometry remains identical.
- Existing filenames and manifest paths remain unchanged.
- Game title, hero image, character art, events, and battle animations remain unchanged.
- `index.html` must remain directly playable offline.

---

## File Structure

- Create `scripts/icon-assets.mjs`: read PNG IHDR metadata, audit expected dimensions, manifest entries, HTML links, opacity color type, and service-worker icon coverage.
- Create `test/icon-assets.test.mjs`: executable icon contract tests.
- Create `scripts/build-icon-assets.py`: deterministic Pillow resizing and small-icon enhancement from the approved master.
- Replace `assets/icons/icon-master.png`: approved 1024×1024 generated master.
- Replace `assets/icons/icon-512.png`, `icon-maskable-512.png`, `icon-192.png`, `apple-touch-icon.png`, and `favicon-32.png`: derived outputs.
- Modify `sw.js`: bump cache version so installed PWAs receive the replacements.
- Modify `README.md`: record the icon source and regeneration command.

### Task 1: Add a technical icon audit before changing assets

**Files:**
- Create: `scripts/icon-assets.mjs`
- Create: `test/icon-assets.test.mjs`

**Interfaces:**
- Consumes: PNG files, `manifest.webmanifest`, `index.html`, `play.html`, and `sw.js`.
- Produces: `readPngInfo(buffer)` and `auditIconAssets(root)` plus a CLI that exits nonzero on contract violations.

- [ ] **Step 1: Write the failing icon contract test**

```js
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
```

- [ ] **Step 2: Run the test and verify the missing module fails**

Run: `node --test test/icon-assets.test.mjs`

Expected: FAIL with module-not-found for `scripts/icon-assets.mjs`.

- [ ] **Step 3: Implement PNG metadata parsing and audits**

```js
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = {
  "icon-master.png": [1024, 1024],
  "icon-512.png": [512, 512],
  "icon-maskable-512.png": [512, 512],
  "icon-192.png": [192, 192],
  "apple-touch-icon.png": [180, 180],
  "favicon-32.png": [32, 32],
};

export function readPngInfo(buffer) {
  if (buffer.length < 33 || buffer.toString("ascii", 1, 4) !== "PNG" || buffer.toString("ascii", 12, 16) !== "IHDR") throw new Error("Invalid PNG");
  const colorType = buffer[25];
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType, hasTransparency: colorType === 4 || colorType === 6 || buffer.includes(Buffer.from("tRNS")) };
}

export async function auditIconAssets(root) {
  const errors = [];
  const dimensions = {};
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const info = readPngInfo(await readFile(path.join(root, "assets", "icons", name)));
    dimensions[name] = [info.width, info.height];
    if (info.width !== expected[0] || info.height !== expected[1]) errors.push(`${name}: expected ${expected.join("x")}, got ${info.width}x${info.height}`);
    if (info.hasTransparency) errors.push(`${name}: icon must use an opaque background`);
  }
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
  for (const [src, sizes, purpose] of [["assets/icons/icon-192.png", "192x192", "any"], ["assets/icons/icon-512.png", "512x512", "any"], ["assets/icons/icon-maskable-512.png", "512x512", "maskable"]]) {
    if (!manifest.icons.some(icon => icon.src === src && icon.sizes === sizes && icon.purpose === purpose)) errors.push(`manifest missing ${src} (${sizes}, ${purpose})`);
  }
  const index = await readFile(path.join(root, "index.html"), "utf8");
  const play = await readFile(path.join(root, "play.html"), "utf8");
  const worker = await readFile(path.join(root, "sw.js"), "utf8");
  for (const file of ["apple-touch-icon.png", "favicon-32.png"]) {
    if (!index.includes(file)) errors.push(`index.html missing ${file}`);
    if (!play.includes(file)) errors.push(`play.html missing ${file}`);
  }
  for (const file of Object.keys(EXPECTED).filter(name => name !== "icon-master.png")) if (!worker.includes(file)) errors.push(`sw.js missing ${file}`);
  return { errors, dimensions };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const report = await auditIconAssets(root);
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
```

- [ ] **Step 4: Run the icon test and CLI audit**

Run: `node --test test/icon-assets.test.mjs`

Expected: PASS against the current files' technical contract.

Run: `node scripts/icon-assets.mjs`

Expected: JSON report with an empty `errors` array.

- [ ] **Step 5: Commit the audit boundary**

```powershell
git add scripts/icon-assets.mjs test/icon-assets.test.mjs
git commit -m "Add mobile icon asset audit"
```

### Task 2: Generate and approve the 1024px master emblem

**Files:**
- Replace: `assets/icons/icon-master.png`

**Interfaces:**
- Consumes: the approved logo design specification and imagegen skill.
- Produces: one visually approved opaque 1024×1024 source image with safe-zone-compliant geometry.

- [ ] **Step 1: Read and invoke the required image generation skill**

Read `C:\Users\g1217\.codex\skills\.system\imagegen\SKILL.md` completely. Announce that the skill is being used to generate the approved raster logo. Do not generate before reading it.

- [ ] **Step 2: Generate the first master candidate with this exact art direction**

Use the image generation tool with no reference image and this prompt:

```text
Create a premium square mobile game app icon, 1024 by 1024, for a modern harbor-city crime management and faction strategy game. Use a full-bleed opaque near-black and deep teal background. Design one bold, simplified emblem: an upper harbor skyline or single bridge arch, and exactly five thick warm-gold road or faction lines converging cleanly into one central junction. Add exactly one small dark-crimson warning beacon at that junction. Keep the emblem geometric, high contrast, centered, and entirely inside the middle 66 percent safe area so circular, rounded-square, and Android maskable crops preserve it. Strong silhouette readable at 32 pixels. Minimal restrained gold glow, polished modern game branding, no scene illustration.

Do not include any text, letters, numbers, people, faces, characters, guns, weapons, crosshairs, telephone receiver, watermarks, logos from existing brands, tiny windows, rain streaks, bridge cables, scratches, or busy photorealistic textures. Exactly five converging gold lines, not four and not six.
```

- [ ] **Step 3: Inspect the candidate at original size and small size**

Use `view_image` on the generated result. Reject it and regenerate if any prohibited element appears, the road count is not exactly five, the emblem approaches the outer 17% margin, or the red node is not singular.

Create a temporary 32×32 preview with Pillow outside the repository or under the allowed temporary directory, view it, and require that the gold emblem remains identifiable without zooming.

- [ ] **Step 4: Save the approved master to the canonical path**

Copy the approved tool output to `assets/icons/icon-master.png`, then use bundled Pillow to convert it to RGB and save it again as an opaque 1024×1024 PNG. Use `view_image` once more on the canonical file to ensure no conversion or path mistake occurred.

- [ ] **Step 5: Commit only the approved master**

```powershell
git add assets/icons/icon-master.png
git commit -m "Replace mobile game logo master"
```

### Task 3: Derive all platform icons from the master

**Files:**
- Create: `scripts/build-icon-assets.py`
- Replace: `assets/icons/icon-512.png`
- Replace: `assets/icons/icon-maskable-512.png`
- Replace: `assets/icons/icon-192.png`
- Replace: `assets/icons/apple-touch-icon.png`
- Replace: `assets/icons/favicon-32.png`
- Modify: `README.md`

**Interfaces:**
- Consumes: approved `icon-master.png` from Task 2 and bundled Python/Pillow.
- Produces: deterministic platform-size outputs and a documented regeneration command.

- [ ] **Step 1: Add the deterministic Pillow build script**

```python
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "assets" / "icons"
SOURCE = ICON_DIR / "icon-master.png"
OUTPUTS = {
    "icon-512.png": 512,
    "icon-maskable-512.png": 512,
    "icon-192.png": 192,
    "apple-touch-icon.png": 180,
    "favicon-32.png": 32,
}

source = Image.open(SOURCE).convert("RGB")
if source.size != (1024, 1024):
    raise SystemExit(f"icon-master.png must be 1024x1024, got {source.size}")

for filename, size in OUTPUTS.items():
    image = source.resize((size, size), Image.Resampling.LANCZOS)
    if size == 32:
        image = ImageEnhance.Contrast(image).enhance(1.12)
        image = image.filter(ImageFilter.UnsharpMask(radius=0.7, percent=135, threshold=2))
    image.save(ICON_DIR / filename, format="PNG", optimize=True)
```

- [ ] **Step 2: Run the build with the bundled Python runtime**

Run:

```powershell
& 'C:\Users\g1217\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\build-icon-assets.py
```

Expected: all five derived PNG files are replaced without errors.

- [ ] **Step 3: Run the technical audit**

Run: `node scripts/icon-assets.mjs`

Expected: empty `errors` array and exact dimensions.

- [ ] **Step 4: Perform visual QA on the real outputs**

Use `view_image` on `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, and `favicon-32.png`. Confirm no stretching, transparent/black fringe, lost road line, clipped bridge/skyline, or doubled red node. Create a temporary crop preview for circle and rounded-square masks and inspect both.

- [ ] **Step 5: Document regeneration**

Add to README:

```markdown
### 手機安裝圖示

`assets/icons/icon-master.png` 是 1024×1024 主檔。平台圖示以 bundled Python/Pillow 執行 `scripts/build-icon-assets.py` 產生，再以 `node scripts/icon-assets.mjs` 檢查尺寸、manifest、HTML 與離線快取引用。
```

- [ ] **Step 6: Commit the derived assets and script**

```powershell
git add scripts/build-icon-assets.py assets/icons/icon-512.png assets/icons/icon-maskable-512.png assets/icons/icon-192.png assets/icons/apple-touch-icon.png assets/icons/favicon-32.png README.md
git commit -m "Build new mobile icon set"
```

### Task 4: Refresh installed PWA caches and verify on desktop/mobile

**Files:**
- Modify: `sw.js`
- Modify: `test/icon-assets.test.mjs`

**Interfaces:**
- Consumes: final icon set from Task 3.
- Produces: a new cache generation and end-to-end installation verification.

- [ ] **Step 1: Add a failing cache-version assertion**

```js
import { readFile } from "node:fs/promises";

test("service worker publishes the logo replacement in cache v41", async () => {
  const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(source, /const CACHE = "crime-five-roads-v41";/);
  for (const name of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "favicon-32.png"]) assert.match(source, new RegExp(name.replace(".", "\\.")));
});
```

- [ ] **Step 2: Run the cache test and verify v40 fails**

Run: `node --test test/icon-assets.test.mjs`

Expected: FAIL because `sw.js` still names cache v40 after the deployment plan.

- [ ] **Step 3: Bump the cache key**

```js
const CACHE = "crime-five-roads-v41";
```

- [ ] **Step 4: Run every automated verification**

Run: `node --test test/icon-assets.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

Run: `npm run audit:art`

Expected: exit 0.

- [ ] **Step 5: Inspect actual browser presentation**

Read and use the `browser:control-in-app-browser` skill. Start `npm run serve`, open the local game, inspect the favicon, manifest, and installed-app icon preview at desktop and mobile viewport sizes. Hard refresh once to confirm cache v41 replaces the old icon. Keep `index.html` and `play.html` icon paths unchanged.

- [ ] **Step 6: Verify direct-file play**

Open `index.html` directly and confirm the favicon changes while the game still loads and remains playable without a server.

- [ ] **Step 7: Commit the cache refresh**

```powershell
git add sw.js test/icon-assets.test.mjs
git commit -m "Publish new mobile game logo"
```
