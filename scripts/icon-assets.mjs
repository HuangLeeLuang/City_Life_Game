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

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function readPngInfo(buffer) {
  if (
    buffer.length < 33
    || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)
    || buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    throw new Error("Invalid PNG");
  }

  const colorType = buffer[25];
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType,
    hasTransparency: colorType === 4 || colorType === 6 || buffer.includes(Buffer.from("tRNS")),
  };
}

export async function auditIconAssets(root) {
  const errors = [];
  const dimensions = {};

  for (const [name, expected] of Object.entries(EXPECTED)) {
    const iconPath = path.join(root, "assets", "icons", name);
    try {
      const info = readPngInfo(await readFile(iconPath));
      dimensions[name] = [info.width, info.height];
      if (info.width !== expected[0] || info.height !== expected[1]) {
        errors.push(`${name}: expected ${expected.join("x")}, got ${info.width}x${info.height}`);
      }
      if (info.hasTransparency) errors.push(`${name}: icon must use an opaque background`);
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }

  const manifest = JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
  const manifestIcons = [
    ["assets/icons/icon-192.png", "192x192", "any"],
    ["assets/icons/icon-512.png", "512x512", "any"],
    ["assets/icons/icon-maskable-512.png", "512x512", "maskable"],
  ];
  for (const [src, sizes, purpose] of manifestIcons) {
    if (!manifest.icons.some((icon) => icon.src === src && icon.sizes === sizes && icon.purpose === purpose)) {
      errors.push(`manifest missing ${src} (${sizes}, ${purpose})`);
    }
  }

  const index = await readFile(path.join(root, "index.html"), "utf8");
  const play = await readFile(path.join(root, "play.html"), "utf8");
  const worker = await readFile(path.join(root, "sw.js"), "utf8");
  for (const file of ["apple-touch-icon.png", "favicon-32.png"]) {
    if (!index.includes(file)) errors.push(`index.html missing ${file}`);
    if (!play.includes(file)) errors.push(`play.html missing ${file}`);
  }
  for (const file of Object.keys(EXPECTED).filter((name) => name !== "icon-master.png")) {
    if (!worker.includes(file)) errors.push(`sw.js missing ${file}`);
  }

  return { errors, dimensions };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const report = await auditIconAssets(root);
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
