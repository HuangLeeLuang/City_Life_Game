import test from "node:test";
import assert from "node:assert/strict";
import { artKey, BUILTIN_ART_REQUIREMENTS, choiceArt, eventArt } from "../src/art-content.mjs";
import { EVENTS } from "../src/content.mjs";
import { CHAPTER_EVENTS } from "../src/chapter-content.mjs";
import { DIFEI_EVENTS } from "../src/character-content.mjs";
import { LIFE_CARDS, LEISURE_CARDS, TRAINING_CARDS, CONTACTS, SIDE_QUESTS } from "../src/life-content.mjs";
import { NIGHT_CARDS } from "../src/night-content.mjs";
import { FACTIONS, TERRITORIES } from "../src/faction-content.mjs";

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

test("covers every statically enumerable built-in option collection", () => {
  const has = (parentId, optionId, category) => BUILTIN_ART_REQUIREMENTS.some((requirement) =>
    requirement.kind === "choice"
    && requirement.parentId === parentId
    && requirement.optionId === optionId
    && requirement.category === category,
  );
  const hasEvent = (id) => BUILTIN_ART_REQUIREMENTS.some((requirement) =>
    requirement.kind === "event" && requirement.parentId === id,
  );
  const assertActivities = (collection, activities, category) => {
    for (const activity of activities) {
      assert.ok(has(`activity:${collection}:${activity.id}`, activity.id, category), `${collection}:${activity.id}`);
    }
  };

  for (const event of [...EVENTS, ...CHAPTER_EVENTS, ...DIFEI_EVENTS]) assert.ok(hasEvent(event.id), `event:${event.id}`);
  for (const event of [...EVENTS, ...CHAPTER_EVENTS, ...DIFEI_EVENTS]) {
    for (const option of event.choices || []) assert.ok(BUILTIN_ART_REQUIREMENTS.some((requirement) =>
      requirement.kind === "choice" && requirement.parentId === event.id && requirement.optionId === option.id,
    ), `event choice:${event.id}:${option.id}`);
  }
  assertActivities("life", LIFE_CARDS, "daily");
  assertActivities("leisure", LEISURE_CARDS, "daily");
  assertActivities("training", TRAINING_CARDS, "daily");
  assertActivities("contacts", CONTACTS, "daily");
  assertActivities("night", NIGHT_CARDS, "night");
  for (const quest of SIDE_QUESTS) for (const [nodeIndex, node] of quest.nodes.entries()) for (const option of node.choices) {
    assert.ok(has(`sidequest:${quest.id}:${nodeIndex}`, option.id, "sidequest"), `sidequest:${quest.id}:${nodeIndex}:${option.id}`);
  }
  for (const faction of FACTIONS) assert.ok(has(`faction:${faction.id}`, "challenge", "battle"), `faction:${faction.id}`);
  for (const territory of TERRITORIES) {
    assert.ok(has(`territory:${territory.id}`, "capture", "battle"), `territory capture:${territory.id}`);
    assert.ok(has(`territory:${territory.id}`, "fortify", "battle"), `territory fortify:${territory.id}`);
  }
  for (const action of ["attack", "brawl", "hack", "guard", "flee"]) assert.ok(has("battle", action, "battle"), `battle:${action}`);
});
