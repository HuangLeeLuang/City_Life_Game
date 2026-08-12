import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const zIndexOf = (source, selector) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(block, `${selector} CSS rule exists`);
  const value = block[1].match(/z-index\s*:\s*(\d+)/);
  assert.ok(value, `${selector} has a numeric z-index`);
  return Number(value[1]);
};

test("automation layer numerically sits between ordinary assistant and picker backdrop", async () => {
  const source = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const automation = zIndexOf(source, ".automation-running");
  const assistant = zIndexOf(source, ".difei-assistant");
  const picker = zIndexOf(source, ".difei-assistant-picker-backdrop");

  assert.ok(automation > assistant, "automation z-index is numerically above the ordinary assistant");
  assert.ok(automation < picker, "automation z-index is numerically below the picker backdrop");
});

test("mobile battle size control scales both sides without changing desktop animation size", async () => {
  const source = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const mobile = source.match(/@media\(max-width:760px\)\{([^\n]+battle-character-scale[^\n]+)\}/);

  assert.ok(mobile, "mobile breakpoint contains the battle character scale rule");
  assert.match(mobile[1], /\.battle-animation-frame/);
  assert.match(mobile[1], /\.battle-team-support-frame/);
  assert.match(mobile[1], /\.battle-enemy-frame/);
  assert.match(mobile[1], /scale:var\(--battle-character-scale,\.75\)/);
  assert.doesNotMatch(source.slice(0, source.indexOf("@media(max-width:760px)")), /scale:var\(--battle-character-scale/);
});
