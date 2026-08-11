import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { TEAM_MEMBERS } from "../src/team-content.mjs";
import { TEAM_SUPPORT_ANIMATIONS, teamSupportAnimationFor } from "../src/team-battle-animation.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("狄菲以外的核心隊員都有職務支援動畫", async () => {
  const members = TEAM_MEMBERS.filter(member => member.id !== "difei");
  assert.deepEqual(Object.keys(TEAM_SUPPORT_ANIMATIONS).sort(), members.map(member => member.id).sort());

  for (const member of members) {
    const animation = teamSupportAnimationFor(member.id);
    assert.equal(animation.actorId, member.id);
    assert.ok(animation.label.includes(member.name));
    assert.match(animation.src, new RegExp(`/team/${member.id}-support\\.webp$`));
    assert.deepEqual(animation.timeline.map(step => step.phase), ["enter", "act", "hold", "exit"]);
    await access(`${root}/${animation.src}`);
  }
});

test("狄菲不會被新的隊員支援動畫覆寫", () => {
  assert.equal(teamSupportAnimationFor("difei"), null);
});

test("其他隊員的支援圖會隨離線遊戲預先快取", async () => {
  const serviceWorker = await readFile(`${root}/sw.js`, "utf8");
  const context = { self: { addEventListener() {} } };
  vm.runInNewContext(`${serviceWorker}\n;globalThis.__offlineFiles = FILES;`, context);
  for (const animation of Object.values(TEAM_SUPPORT_ANIMATIONS)) {
    assert.ok(context.__offlineFiles.includes(`./${animation.src}`), `missing offline cache entry for ${animation.actorId}`);
  }
});
