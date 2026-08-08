import test from "node:test";
import assert from "node:assert/strict";
import { artKey, choiceArt, eventArt } from "../src/art-content.mjs";

test("builds stable normalized art keys", () => {
  assert.equal(artKey("signal", "trace"), "signal--trace");
  assert.equal(
    artKey("sidequest:old_debt:node_1", "pay"),
    "sidequest-old_debt-node_1--pay",
  );
});

test("uses a custom category fallback for dynamic choices", () => {
  const art = choiceArt("custom:user-card", "custom-choice", "custom");

  assert.equal(art.fallback, true);
  assert.match(art.src, /assets\/images\/fallbacks\/custom\.webp$/);
});

test("finds the existing signal event desktop art", () => {
  assert.match(eventArt("signal").desktop, /event-signal-desktop\.webp$/);
});
