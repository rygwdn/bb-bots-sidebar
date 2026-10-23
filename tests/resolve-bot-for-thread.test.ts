import { afterEach, expect, it } from "vitest";
import { makeThreadResponse } from "@get-bb/plugin-sdk/testing";
import { backend, PERSONAL_ID, project } from "./backend-fixture";

const instances: Awaited<ReturnType<typeof backend>>[] = [];
afterEach(async () => { await Promise.all(instances.splice(0).map(host => host.harness.lifecycle.dispose())); });
async function setup() { const host = await backend([project()]); instances.push(host); return host; }
function addThread(host: Awaited<ReturnType<typeof backend>>, id: string, projectId = PERSONAL_ID, parentThreadId: string | null = null) {
  const value = makeThreadResponse({ id, projectId, parentThreadId, createdAt: 1, title: "Conversation", originPluginId: null }); host.threads.set(id, value); return value;
}

it("resolves the bot bound to a thread", async () => {
  const host = await setup(); const bot = await host.create("Atlas");
  addThread(host, "chat");
  host.store.bind("chat", bot.id);
  await expect(host.harness.behavior.callRpc("resolveBotForThread", { threadId: "chat" })).resolves.toEqual({ botId: bot.id, botName: "Atlas" });
});

it("returns null for an unbound thread without binding it", async () => {
  const host = await setup(); await host.create("Atlas");
  addThread(host, "chat");
  await expect(host.harness.behavior.callRpc("resolveBotForThread", { threadId: "chat" })).resolves.toBeNull();
  expect(host.store.owner("chat")).toBeNull();
});

it("inherits the bot through the parent conversation", async () => {
  const host = await setup(); const bot = await host.create("Atlas");
  addThread(host, "parent"); host.store.bind("parent", bot.id);
  addThread(host, "child", PERSONAL_ID, "parent");
  await expect(host.harness.behavior.callRpc("resolveBotForThread", { threadId: "child" })).resolves.toEqual({ botId: bot.id, botName: "Atlas" });
});

it("returns null for a thread that does not exist", async () => {
  const host = await setup();
  await expect(host.harness.behavior.callRpc("resolveBotForThread", { threadId: "missing" })).resolves.toBeNull();
});
