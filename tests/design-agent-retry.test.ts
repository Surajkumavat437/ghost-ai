import assert from "node:assert/strict";
import { test } from "node:test";

import { generateDesignPlan, layoutGeneratedGraph, type DesignAction } from "../trigger/design-agent";

function apiError(statusCode: number, message = `HTTP ${statusCode}`) {
  return Object.assign(new Error(message), { statusCode });
}

function hooks(request: (reasoningEffort: "low" | "minimal") => Promise<{ text: string; finishReason?: string | null }>, retries: number[] = []) {
  return {
    request,
    wait: async () => undefined,
    onRetry: async (attempt: number) => { retries.push(attempt); },
  };
}

test("returns an OpenRouter design plan on success", async () => {
  const mock = hooks(async () => ({ text: '{"actions":[]}' }));
  const result = await generateDesignPlan("test-key", "system", "prompt", new AbortController().signal, mock.onRetry, mock);
  assert.equal(result.text, '{"actions":[]}');
});

for (const status of [408, 429, 500, 502, 503, 504]) {
  test(`retries a transient OpenRouter ${status} response`, async () => {
    let attempts = 0;
    const retries: number[] = [];
    const mock = hooks(async () => {
      attempts += 1;
      if (attempts === 1) throw apiError(status);
      return { text: "{\"actions\":[]}" };
    }, retries);
    await generateDesignPlan("test-key", "system", "prompt", new AbortController().signal, mock.onRetry, mock);
    assert.equal(attempts, 2);
    assert.deepEqual(retries, [1]);
  });
}

test("retries a network timeout and then succeeds", async () => {
  let attempts = 0;
  const mock = hooks(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("The operation was aborted due to timeout");
    return { text: "{\"actions\":[]}" };
  });
  await generateDesignPlan("test-key", "system", "prompt", new AbortController().signal, mock.onRetry, mock);
  assert.equal(attempts, 2);
});

test("retries an empty OpenRouter answer and then succeeds", async () => {
  let attempts = 0;
  const mock = hooks(async () => {
    attempts += 1;
    return attempts === 1 ? { text: "" } : { text: '{"actions":[]}' };
  });
  const result = await generateDesignPlan("test-key", "system", "prompt", new AbortController().signal, mock.onRetry, mock);
  assert.equal(attempts, 2);
  assert.equal(result.text, '{"actions":[]}');
});

test("retries output-limit responses with minimal reasoning", async () => {
  const efforts: Array<"low" | "minimal"> = [];
  const mock = hooks(async (reasoningEffort) => {
    efforts.push(reasoningEffort);
    return efforts.length === 1
      ? { text: "", finishReason: "length" }
      : { text: '{"actions":[]}', finishReason: "stop" };
  });
  await generateDesignPlan("test-key", "system", "prompt", new AbortController().signal, mock.onRetry, mock);
  assert.deepEqual(efforts, ["low", "minimal"]);
});

test("reports exhausted empty OpenRouter answers clearly", async () => {
  const mock = hooks(async () => ({ text: "" }));
  await assert.rejects(
    generateDesignPlan("test-key", "system", "prompt", new AbortController().signal, mock.onRetry, mock),
    { name: "AbortTaskRunError", message: "OpenRouter returned no design plan after three attempts. Try again in a moment." },
  );
});

test("returns a controlled error after transient provider retries are exhausted", async () => {
  const mock = hooks(async () => { throw apiError(503); });
  await assert.rejects(
    generateDesignPlan("test-key", "system", "prompt", new AbortController().signal, mock.onRetry, mock),
    { name: "AbortTaskRunError", message: "OpenRouter is temporarily unavailable. Wait a minute, then resend your prompt." },
  );
});

test("reports exhausted generation timeouts as timeouts instead of provider unavailability", async () => {
  let attempts = 0;
  const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  const mock = hooks(async () => { attempts += 1; throw timeout; });
  await assert.rejects(
    generateDesignPlan("test-key", "system", "prompt", new AbortController().signal, mock.onRetry, mock),
    (error: unknown) => error instanceof Error && /timed out after 120 seconds/.test(error.message) && error.cause === timeout,
  );
  assert.equal(attempts, 3);
});

test("does not retry a cancelled generation", async () => {
  const controller = new AbortController();
  const cancellation = Object.assign(new Error("cancelled"), { name: "AbortError" });
  let attempts = 0;
  const mock = hooks(async () => { attempts += 1; controller.abort(cancellation); throw cancellation; });
  await assert.rejects(generateDesignPlan("test-key", "system", "prompt", controller.signal, mock.onRetry, mock));
  assert.equal(attempts, 1);
});

test("lays out a new architecture in connected left-to-right layers below existing canvas content", () => {
  const actions: DesignAction[] = [
    { type: "addNode", node: { id: "client", label: "Client", shape: "rectangle", x: 900, y: 800 } },
    { type: "addNode", node: { id: "api", label: "API", shape: "rectangle", x: 1200, y: 800 } },
    { type: "addNode", node: { id: "db", label: "Database", shape: "cylinder", x: 1500, y: 800 } },
    { type: "addEdge", edge: { id: "client-api", source: "client", target: "api", label: "request" } },
    { type: "addEdge", edge: { id: "api-db", source: "api", target: "db", label: "query" } },
  ];
  layoutGeneratedGraph(actions, {
    old: { position: { x: 100, y: 200 }, width: 180, height: 100 },
  });
  const nodes = actions.flatMap((action) => action.type === "addNode" ? [action.node] : []);
  assert.deepEqual(nodes.map(({ x, y }) => [x, y]), [[100, 660], [400, 660], [700, 660]]);
});

test("places one independent generated node below existing canvas content", () => {
  const actions: DesignAction[] = [
    { type: "addNode", node: { id: "new-service", label: "New service", shape: "rectangle", x: 700, y: 200 } },
  ];
  const currentNodes = { existing: { position: { x: 100, y: 200 }, width: 180, height: 100 } };

  layoutGeneratedGraph(actions, currentNodes);

  const addedNode = actions[0];
  assert.equal(addedNode.type, "addNode");
  if (addedNode.type === "addNode") assert.deepEqual([addedNode.node.x, addedNode.node.y], [100, 660]);
  assert.deepEqual(currentNodes.existing.position, { x: 100, y: 200 });
});

test("preserves model positions when a generated edge connects to an existing node", () => {
  const actions: DesignAction[] = [
    { type: "addNode", node: { id: "new-service", label: "New service", shape: "rectangle", x: 700, y: 800 } },
    { type: "addEdge", edge: { id: "existing-new", source: "existing", target: "new-service" } },
  ];
  layoutGeneratedGraph(actions, { existing: { position: { x: 400, y: 200 }, width: 180, height: 100 } });
  const addedNode = actions.find((action) => action.type === "addNode");
  assert.ok(addedNode?.type === "addNode");
  assert.deepEqual([addedNode.node.x, addedNode.node.y], [700, 800]);
});
