import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import * as artContent from "../src/art-content.mjs";
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

test("customDirect 卡片圖片身分不依賴 custom_ ID 前綴", () => {
  assert.equal(typeof artContent.cardArtIdentity, "function");
  assert.deepEqual(artContent.cardArtIdentity({ id: "life_work", customDirect: true }, "life"), {
    parentId: "custom:life_work",
    optionId: "life_work",
    category: "custom",
  });
});

test("內建生活與夜間卡片圖片身分沿用清冊父層", () => {
  assert.equal(typeof artContent.cardArtIdentity, "function");
  assert.deepEqual(artContent.cardArtIdentity({ id: "life_work" }, "life"), {
    parentId: "activity:life:life_work",
    optionId: "life_work",
    category: "daily",
  });
  assert.deepEqual(artContent.cardArtIdentity({ id: "night_shelter" }, "night"), {
    parentId: "activity:night:night_shelter",
    optionId: "night_shelter",
    category: "daily",
  });
});

test("資產升級縮圖與結果共用市場圖片身分", () => {
  assert.equal(typeof artContent.upgradeArtIdentity, "function");
  assert.deepEqual(artContent.upgradeArtIdentity("weapons", "weapon_sawed_shotgun"), {
    parentId: "upgrade:weapons",
    optionId: "weapon_sawed_shotgun",
    category: "market",
  });
  assert.equal(
    choiceArt("upgrade:weapons", "weapon_sawed_shotgun", "market").src,
    "assets/images/fallbacks/market.webp",
  );
  assert.equal(
    artContent.choiceArtByKey("upgrade-weapons--weapon_sawed_shotgun").src,
    "assets/images/fallbacks/market.webp",
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

test("結果狀態提供成功失敗與中性文字", () => {
  assert.equal(typeof artContent.resultStatus, "function");
  const { resultStatus } = artContent;
  assert.deepEqual(resultStatus(true), { label: "成功", tone: "success" });
  assert.deepEqual(resultStatus(false), { label: "失敗", tone: "failure" });
  assert.deepEqual(resultStatus(undefined), { label: "結果", tone: "neutral" });
});

test("結果圖片鍵直接解析並對未知內容使用有限備援", () => {
  assert.equal(typeof artContent.choiceArtByKey, "function");
  assert.deepEqual(artContent.choiceArtByKey("signal--trace", "event"), {
    key: "signal--trace",
    src: "assets/images/choices/signal--trace.webp",
    alt: "追查來電：請電信公司內鬼定位公用電話。",
    fallback: false,
  });
  assert.match(
    artContent.choiceArtByKey(undefined, "not-a-category").src,
    /assets\/images\/fallbacks\/default\.webp$/,
  );
});

test("結果圖片鍵在沒有類別提示時推導有限備援類別", () => {
  assert.match(artContent.choiceArtByKey("battle--unknown-action").src, /fallbacks\/battle\.webp$/);
  assert.match(artContent.choiceArtByKey("sidequest-old-debt-0--pay").src, /fallbacks\/sidequest\.webp$/);
  assert.match(artContent.choiceArtByKey("activity-leisure-rest--rest").src, /fallbacks\/daily\.webp$/);
  assert.match(artContent.choiceArtByKey("asset_market--buy").src, /fallbacks\/market\.webp$/);
});

test("動態夜間選項結果沿用每日活動備援", () => {
  assert.match(artContent.choiceArtByKey("night_social_food--mira").src, /fallbacks\/daily\.webp$/);
});

test("真實自訂卡 ID 結果使用自訂備援", () => {
  assert.match(artContent.choiceArtByKey("custom_1723100000000_42--custom_1723100000000_42").src, /fallbacks\/custom\.webp$/);
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

test("service worker keeps choice art out of the install cache and caches images on demand", async () => {
  const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");

  assert.match(source, /const CACHE = "crime-five-roads-v37"/);
  assert.match(source, /\.\/dist\/game\.bundle\.js/);
  assert.doesNotMatch(source, /FILES[\s\S]*assets\/images\/choices\/.*\.webp/);
  assert.match(source, /request\.destination === "image"/);
  assert.match(source, /cache\.put\(event\.request, copy\)/);
});

test("service worker keeps an image response pending until its runtime cache write finishes", async () => {
  const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  const listeners = new Map();
  let releaseCacheWrite;
  let cacheWriteFinished = false;
  const cacheWrite = new Promise((resolve) => {
    releaseCacheWrite = () => {
      cacheWriteFinished = true;
      resolve();
    };
  });
  const response = { ok: true, clone: () => ({ body: "copy" }) };
  const caches = {
    match: async () => undefined,
    open: async () => ({ addAll: async () => {}, put: async () => cacheWrite }),
    keys: async () => [],
    delete: async () => true,
  };
  const self = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  runInNewContext(source, { self, caches, fetch: async () => response, URL, Promise });

  let responsePromise;
  listeners.get("fetch")({
    request: { method: "GET", destination: "image", url: "https://game.test/choice.webp" },
    respondWith: (promise) => { responsePromise = promise; },
  });
  let responseSettled = false;
  responsePromise.then(() => { responseSettled = true; });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(responseSettled, false, "response lifecycle must include the pending cache.put");
  releaseCacheWrite();
  assert.equal(await responsePromise, response);
  assert.equal(cacheWriteFinished, true);
});

test("service worker returns a successful image response when runtime cache writes reject", async () => {
  const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");

  for (const failure of ["open", "put"]) {
    const listeners = new Map();
    const response = { ok: true, clone: () => ({ body: "copy" }) };
    const caches = {
      match: async () => undefined,
      open: async () => {
        if (failure === "open") throw new Error("cache open rejected");
        return { addAll: async () => {}, put: async () => { throw new Error("cache put rejected"); } };
      },
      keys: async () => [],
      delete: async () => true,
    };
    const self = {
      addEventListener: (type, listener) => listeners.set(type, listener),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    };
    runInNewContext(source, { self, caches, fetch: async () => response, URL, Promise });

    let responsePromise;
    listeners.get("fetch")({
      request: { method: "GET", destination: "image", url: "https://game.test/choice.webp" },
      respondWith: (promise) => { responsePromise = promise; },
    });

    assert.equal(await responsePromise, response, `${failure} rejection must not discard the network response`);
  }
});
