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

test("automation stop bar stays above Difei but below picker overlays", async () => {
  const source = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const automation = zIndexOf(source, ".automation-running");
  const assistant = zIndexOf(source, ".difei-assistant");
  const scope = zIndexOf(source, ".difei-assistant-scope[open]");
  const picker = zIndexOf(source, ".difei-assistant-picker-backdrop");

  assert.ok(automation > assistant, "Stop control must receive pointer input above the visible assistant");
  assert.ok(automation < scope, "expanded assistant scope must remain above the Stop control");
  assert.ok(automation < picker, "assistant picker overlay must remain above the Stop control");
});
