import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS } from "../src/content.mjs";
import { CHAPTER_EVENTS } from "../src/chapter-content.mjs";
import { DIFEI_EVENTS } from "../src/character-content.mjs";
import { LIFE_CARDS, LEISURE_CARDS, TRAINING_CARDS, CONTACTS, SIDE_QUESTS } from "../src/life-content.mjs";
import { NIGHT_CARDS } from "../src/night-content.mjs";
import { FACTIONS, TERRITORIES } from "../src/faction-content.mjs";
import { BUILTIN_ART_REQUIREMENTS } from "../src/art-content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumentsSet = new Set(process.argv.slice(2));
const allowMissing = argumentsSet.has("--allow-missing");
const jsonOutput = argumentsSet.has("--json") || allowMissing;
const categoryArgument = process.argv.find((argument) => argument.startsWith("--category="));
const categories = categoryArgument
  ? new Set(categoryArgument.slice("--category=".length).split(",").filter(Boolean))
  : null;

// Keep these imports explicit: this script is the audit boundary for every
// statically enumerable game-content source.
void [EVENTS, CHAPTER_EVENTS, DIFEI_EVENTS, LIFE_CARDS, LEISURE_CARDS, TRAINING_CARDS, CONTACTS, SIDE_QUESTS, NIGHT_CARDS, FACTIONS, TERRITORIES];

function expectedDimensions(requirement, pathIndex) {
  if (requirement.kind === "choice") return [3, 2];
  return pathIndex === 0 ? [16, 9] : [4, 5];
}

function hasExpectedRatio({ width, height }, [expectedWidth, expectedHeight]) {
  return width * expectedHeight === height * expectedWidth;
}

function readWebpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 ") {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (buffer[20] !== 0x2f) return null;
    return {
      width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8),
      height: 1 + (buffer[22] >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0f) << 10),
    };
  }
  return null;
}

async function fileExists(relativePath) {
  try {
    await access(path.resolve(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function countByCategory(requirements) {
  return Object.fromEntries([...new Set(requirements.map((requirement) => requirement.category))]
    .sort()
    .map((category) => [category, requirements.filter((requirement) => requirement.category === category).length]));
}

const selectedRequirements = BUILTIN_ART_REQUIREMENTS.filter((requirement) => !categories || categories.has(requirement.category));
const missingMappings = [];
const missingFiles = [];
const wrongExtensions = [];
const wrongDimensions = [];
const paths = new Map();

for (const requirement of selectedRequirements) {
  if (requirement.paths.length === 0) {
    missingMappings.push({ kind: requirement.kind, key: requirement.key, category: requirement.category });
    continue;
  }

  for (const [pathIndex, relativePath] of requirement.paths.entries()) {
    const prior = paths.get(relativePath);
    if (prior) prior.push(requirement.key);
    else paths.set(relativePath, [requirement.key]);

    if (path.extname(relativePath).toLowerCase() !== ".webp") {
      wrongExtensions.push({ key: requirement.key, path: relativePath });
      continue;
    }
    if (!await fileExists(relativePath)) {
      missingFiles.push({ key: requirement.key, path: relativePath });
      continue;
    }
    const dimensions = readWebpDimensions(await readFile(path.resolve(ROOT, relativePath)));
    if (!dimensions || !hasExpectedRatio(dimensions, expectedDimensions(requirement, pathIndex))) {
      wrongDimensions.push({ key: requirement.key, path: relativePath, dimensions });
    }
  }
}

const duplicatePaths = [...paths.entries()]
  .filter(([, keys]) => keys.length > 1)
  .map(([assetPath, keys]) => ({ path: assetPath, keys: [...keys].sort() }))
  .sort((left, right) => left.path.localeCompare(right.path));

const sortByKey = (items) => items.sort((left, right) => `${left.key}\0${left.path || ""}`.localeCompare(`${right.key}\0${right.path || ""}`));
sortByKey(missingMappings);
sortByKey(missingFiles);
sortByKey(wrongExtensions);
sortByKey(wrongDimensions);

const inventory = {
  countsByCategory: countByCategory(selectedRequirements),
  requirements: selectedRequirements.map(({ kind, key, parentId, optionId, category, paths }) => ({ kind, key, parentId, ...(optionId ? { optionId } : {}), category, paths })),
  missingMappings,
  missingFiles,
  wrongExtensions,
  wrongDimensions,
  duplicatePaths,
};

if (jsonOutput) console.log(JSON.stringify(inventory, null, 2));
else console.log(`Art audit: ${selectedRequirements.length} requirements, ${missingMappings.length} missing mappings, ${missingFiles.length} missing files.`);

if (
  wrongExtensions.length > 0
  || wrongDimensions.length > 0
  || duplicatePaths.length > 0
  || (!allowMissing && (missingMappings.length > 0 || missingFiles.length > 0))
) {
  process.exitCode = 1;
}
