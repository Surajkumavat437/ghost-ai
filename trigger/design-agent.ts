import { OpenRouter } from "@openrouter/sdk";
import { AbortTaskRunError, task } from "@trigger.dev/sdk";
import { LiveMap, LiveObject } from "@liveblocks/node";
import type { LiveblocksEdge, LiveblocksFlow, LiveblocksNode } from "@liveblocks/react-flow";

import { getLiveblocksClient } from "@/lib/liveblocks";
import { AI_STATUS_FEED_ID } from "@/types/tasks";
import { NODE_COLORS, NODE_SHAPES, type CanvasEdge, type CanvasNode, type NodeShape } from "@/types/canvas";

interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

type NodeColor = (typeof NODE_COLORS)[number]["color"];

export type DesignAction =
  | { type: "addNode"; node: { id: string; label: string; shape: NodeShape; x: number; y: number; width?: number; height?: number; color?: NodeColor } }
  | { type: "moveNode"; id: string; x: number; y: number }
  | { type: "resizeNode"; id: string; width: number; height: number }
  | { type: "updateNode"; id: string; label?: string; shape?: NodeShape; color?: NodeColor }
  | { type: "deleteNode"; id: string }
  | { type: "addEdge"; edge: { id: string; source: string; target: string; label?: string } }
  | { type: "deleteEdge"; id: string };

type FlowStorage = LiveblocksFlow<CanvasNode, CanvasEdge>;
type FlowMaps = {
  nodes: LiveMap<string, LiveblocksNode<CanvasNode>>;
  edges: LiveMap<string, LiveblocksEdge<CanvasEdge>>;
};

const AI_ID = "ghost-ai";
const AI_COLOR = "#8B82FF";
const VALID_COLORS: readonly NodeColor[] = NODE_COLORS.map((entry) => entry.color);

function isNodeColor(value: unknown): value is NodeColor {
  return typeof value === "string" && VALID_COLORS.includes(value as NodeColor);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function number(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function errorDetails(error: unknown, depth = 0): Record<string, unknown> {
  if (depth > 2) return { truncated: true };
  if (error instanceof Error) {
    const details: Record<string, unknown> = {
      name: error.name,
      message: error.message.slice(0, 500),
    };
    const candidate = error as Error & {
      status?: unknown;
      statusCode?: unknown;
      details?: unknown;
      errors?: unknown;
      lastError?: unknown;
      cause?: unknown;
    };
    if (typeof candidate.status === "number") details.status = candidate.status;
    if (typeof candidate.statusCode === "number") details.statusCode = candidate.statusCode;
    if (typeof candidate.details === "string") details.details = candidate.details.slice(0, 500);
    if (Array.isArray(candidate.errors)) {
      details.errors = candidate.errors.slice(0, 3).map((item) => errorDetails(item, depth + 1));
    }
    if (candidate.lastError !== undefined) details.lastError = errorDetails(candidate.lastError, depth + 1);
    else if (candidate.cause !== undefined) details.cause = errorDetails(candidate.cause, depth + 1);
    return details;
  }
  return { message: String(error).slice(0, 500) };
}

const OPENROUTER_REQUEST_TIMEOUT_MS = 120_000;
const OPENROUTER_MODEL = "nvidia/nemotron-3-nano-30b-a3b";
// Reasoning tokens count toward Nemotron's completion budget. Keep plans small
// while leaving enough room for the model to finish the JSON response.
const OPENROUTER_MAX_COMPLETION_TOKENS = 16_384;
const MAX_PROVIDER_ATTEMPTS = 3;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const DESIGN_PLAN_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  jsonSchema: {
    name: "canvas_design_plan",
    strict: false,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["actions"],
      properties: {
        actions: {
          type: "array",
          maxItems: 32,
          items: {
            oneOf: [
              { type: "object", required: ["type", "node"], properties: { type: { const: "addNode" }, node: { type: "object", required: ["id", "label", "shape", "x", "y"], properties: { id: { type: "string" }, label: { type: "string" }, shape: { enum: NODE_SHAPES }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" }, color: { type: "string" } } } } },
              { type: "object", required: ["type", "id", "x", "y"], properties: { type: { const: "moveNode" }, id: { type: "string" }, x: { type: "number" }, y: { type: "number" } } },
              { type: "object", required: ["type", "id", "width", "height"], properties: { type: { const: "resizeNode" }, id: { type: "string" }, width: { type: "number" }, height: { type: "number" } } },
              { type: "object", required: ["type", "id"], properties: { type: { const: "updateNode" }, id: { type: "string" }, label: { type: "string" }, shape: { enum: NODE_SHAPES }, color: { type: "string" } } },
              { type: "object", required: ["type", "id"], properties: { type: { const: "deleteNode" }, id: { type: "string" } } },
              { type: "object", required: ["type", "edge"], properties: { type: { const: "addEdge" }, edge: { type: "object", required: ["id", "source", "target"], properties: { id: { type: "string" }, source: { type: "string" }, target: { type: "string" }, label: { type: "string" } } } } },
              { type: "object", required: ["type", "id"], properties: { type: { const: "deleteEdge" }, id: { type: "string" } } },
            ],
          },
        },
      },
    },
  },
};

function getHttpStatus(error: unknown): number | undefined {
  if (!record(error)) return undefined;
  const status = typeof error.statusCode === "number" ? error.statusCode : error.status;
  return typeof status === "number" ? status : undefined;
}

function isRetryableProviderError(error: unknown, depth = 0): boolean {
  if (depth > 3 || !record(error)) return false;
  const status = getHttpStatus(error);
  if (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status)) return true;
  const message = typeof error.message === "string" ? error.message : "";
  if (/timeout|timed out|cannot connect|transport close|connection reset|socket hang up|econnreset|eai_again|network error|http\/2/i.test(message)) return true;
  const nested = [error.lastError, error.cause, ...(Array.isArray(error.errors) ? error.errors : [])];
  return nested.some((entry) => isRetryableProviderError(entry, depth + 1));
}

function isProviderTimeout(error: unknown, depth = 0): boolean {
  if (depth > 3 || !record(error)) return false;
  if (error.name === "TimeoutError" || error.name === "RequestTimeoutError" || /timeout|timed out/i.test(typeof error.message === "string" ? error.message : "")) return true;
  if (getHttpStatus(error) === 408) return true;
  const nested = [error.lastError, error.cause, ...(Array.isArray(error.errors) ? error.errors : [])];
  return nested.some((entry) => isProviderTimeout(entry, depth + 1));
}

function waitForRetry(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error("Generation was cancelled"));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      reject(signal.reason ?? new Error("Generation was cancelled"));
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

interface OpenRouterGenerationTestHooks {
  request?: (reasoningEffort: "low" | "minimal") => Promise<{ text: string; finishReason?: string | null; model?: string; responseShape?: string }>;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}

type OpenRouterRetryReason = "transient" | "output_limit";

export async function generateDesignPlan(
  apiKey: string,
  system: string,
  prompt: string,
  signal: AbortSignal,
  onRetry: (attempt: number, reason: OpenRouterRetryReason) => Promise<void>,
  hooks: OpenRouterGenerationTestHooks = {},
) {
  const openRouter = new OpenRouter({ apiKey, retryConfig: { strategy: "none" } });
  let reasoningEffort: "low" | "minimal" = "low";
  const testRequest = hooks.request;
  const call = testRequest ? () => testRequest(reasoningEffort) : async () => {
    const response = await openRouter.chat.send({ chatRequest: {
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      maxCompletionTokens: OPENROUTER_MAX_COMPLETION_TOKENS,
      reasoningEffort,
      responseFormat: DESIGN_PLAN_RESPONSE_FORMAT,
    } }, { timeoutMs: OPENROUTER_REQUEST_TIMEOUT_MS, signal });
    const choice = response.choices[0];
    const content = choice?.message.content;
    const text = typeof content === "string" ? content : Array.isArray(content)
      ? content.flatMap((item) => "text" in item && typeof item.text === "string" ? [item.text] : []).join("")
      : "";
    const message = choice?.message;
    const reasoning = message?.reasoning;
    const reasoningLength = typeof reasoning === "string" ? reasoning.length : 0;
    console.info("[design-agent] OpenRouter response received", {
      provider: "OpenRouter",
      model: response.model ?? OPENROUTER_MODEL,
      responseShape: "choices[].message.content/reasoning",
      choiceCount: response.choices.length,
      finishReason: choice?.finishReason ?? null,
      contentLength: text.length,
      reasoningLength,
      hasToolCalls: Boolean(message?.toolCalls?.length),
    });
    return { text, finishReason: choice?.finishReason, model: response.model, responseShape: "choices[].message" };
  };
  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await call();
      const durationMs = Date.now() - startedAt;
      if (!response.text.trim()) {
        const emptyError = Object.assign(new Error("OpenRouter returned no final answer text"), {
          retryableEmptyResponse: true,
          finishReason: response.finishReason ?? null,
        });
        console.error("[design-agent] OpenRouter empty response", {
          provider: "OpenRouter", model: response.model ?? OPENROUTER_MODEL,
          finishReason: response.finishReason ?? null,
          responseShape: response.responseShape ?? "choices[].message.content",
          contentLength: 0,
          durationMs,
          attempt,
        });
        throw emptyError;
      }
      console.info("[design-agent] OpenRouter request completed", {
        provider: "OpenRouter", model: response.model ?? OPENROUTER_MODEL,
        durationMs, attempt, maxAttempts: MAX_PROVIDER_ATTEMPTS,
      });
      return { text: response.text, finishReason: response.finishReason };
    } catch (error) {
      if (isAbortError(error) || signal.aborted) throw error;
      const statusCode = getHttpStatus(error);
      const retryable = isRetryableProviderError(error) || (record(error) && error.retryableEmptyResponse === true);
      const outputLimit = record(error) && error.retryableEmptyResponse === true && error.finishReason === "length";
      console.error("[design-agent] OpenRouter request failed", {
        provider: "OpenRouter", model: OPENROUTER_MODEL, statusCode: statusCode ?? null,
        providerError: errorDetails(error), retryable,
        timedOut: isProviderTimeout(error), durationMs: Date.now() - startedAt,
        attempt, maxAttempts: MAX_PROVIDER_ATTEMPTS,
      });
      if (!retryable || attempt === MAX_PROVIDER_ATTEMPTS) {
        if (record(error) && (error.name === "NotFoundResponseError" || /unavailable for free/i.test(typeof error.message === "string" ? error.message : ""))) {
          const unavailableError = new AbortTaskRunError(`OpenRouter model ${OPENROUTER_MODEL} is unavailable to this account. Check the model slug and OpenRouter billing access.`);
          Object.assign(unavailableError, { cause: error });
          throw unavailableError;
        }
        if (isProviderTimeout(error)) {
          const timeoutError = new AbortTaskRunError(`Nemotron generation timed out after ${Math.round(OPENROUTER_REQUEST_TIMEOUT_MS / 1000)} seconds. Try again or shorten the request.`);
          Object.assign(timeoutError, { cause: error });
          throw timeoutError;
        }
        if (isRetryableProviderError(error)) throw new AbortTaskRunError("OpenRouter is temporarily unavailable. Wait a minute, then resend your prompt.");
        if (record(error) && error.retryableEmptyResponse === true && error.finishReason === "length") {
          const outputLimitError = new AbortTaskRunError("Nemotron reached its output token limit before returning a design plan. Simplify the request or reduce the existing canvas complexity, then try again.");
          Object.assign(outputLimitError, { cause: error });
          throw outputLimitError;
        }
        if (record(error) && error.retryableEmptyResponse === true) {
          const emptyResponseError = new AbortTaskRunError("OpenRouter returned no design plan after three attempts. Try again in a moment.");
          Object.assign(emptyResponseError, { cause: error });
          throw emptyResponseError;
        }
        const taskError = new AbortTaskRunError("OpenRouter could not generate a design plan. Check the Trigger.dev logs for the provider error details.");
        Object.assign(taskError, { cause: error });
        throw taskError;
      }
      if (attempt < MAX_PROVIDER_ATTEMPTS) {
        if (outputLimit) reasoningEffort = "minimal";
        const delay = Math.min(20_000, 1_000 * 2 ** (attempt - 1)) + Math.random() * 500;
        await onRetry(attempt, outputLimit ? "output_limit" : "transient");
        console.warn("[design-agent] Retrying OpenRouter request", { model: OPENROUTER_MODEL, attempt, retryReason: outputLimit ? "output_limit" : "transient", nextReasoningEffort: reasoningEffort, delayMs: Math.round(delay), cause: errorDetails(error) });
        await (hooks.wait ?? waitForRetry)(delay, signal);
      }
    }
  }
  throw new AbortTaskRunError("OpenRouter is temporarily unavailable. Wait a minute, then resend your prompt.");
}

function parseActions(value: unknown): { actions: DesignAction[]; skipped: number } {
  if (!record(value) || !Array.isArray(value.actions)) throw new Error("OpenRouter returned an invalid design plan");
  if (value.actions.length > 32) throw new Error("OpenRouter returned too many canvas actions (maximum 32)");
  const actions: DesignAction[] = [];
  let skipped = 0;
  for (const [index, raw] of value.actions.entries()) {
    try {
      if (!record(raw) || typeof raw.type !== "string") throw new Error("Action must be an object with a string type");
      const action = (() : DesignAction => {
    switch (raw.type) {
      case "addNode": {
        const node = raw.node;
        if (!record(node) || typeof node.id !== "string" || typeof node.label !== "string" || !NODE_SHAPES.includes(node.shape as NodeShape) || !number(node.x) || !number(node.y)) throw new Error("OpenRouter returned an invalid node");
        return { type: raw.type, node: { id: node.id, label: node.label.slice(0, 120), shape: node.shape as NodeShape, x: node.x, y: node.y, width: number(node.width) ? Math.max(100, Math.min(520, node.width)) : 180, height: number(node.height) ? Math.max(70, Math.min(360, node.height)) : 100, color: isNodeColor(node.color) ? node.color : NODE_COLORS[0].color } };
      }
      case "moveNode":
        if (typeof raw.id !== "string" || !number(raw.x) || !number(raw.y)) throw new Error("OpenRouter returned an invalid move");
        return { type: raw.type, id: raw.id, x: raw.x, y: raw.y };
      case "resizeNode":
        if (typeof raw.id !== "string" || !number(raw.width) || !number(raw.height)) throw new Error("OpenRouter returned an invalid resize");
        return { type: raw.type, id: raw.id, width: Math.max(100, Math.min(520, raw.width)), height: Math.max(70, Math.min(360, raw.height)) };
      case "updateNode":
        if (typeof raw.id !== "string" || (raw.shape !== undefined && !NODE_SHAPES.includes(raw.shape as NodeShape))) throw new Error("OpenRouter returned an invalid node update");
        return { type: raw.type, id: raw.id, ...(typeof raw.label === "string" ? { label: raw.label.slice(0, 120) } : {}), ...(raw.shape ? { shape: raw.shape as NodeShape } : {}), ...(isNodeColor(raw.color) ? { color: raw.color } : {}) };
      case "deleteNode":
      case "deleteEdge":
        if (typeof raw.id !== "string") throw new Error("OpenRouter returned an invalid delete action");
        return { type: raw.type, id: raw.id };
      case "addEdge": {
        const edge = raw.edge;
        if (!record(edge) || typeof edge.id !== "string" || typeof edge.source !== "string" || typeof edge.target !== "string") throw new Error("OpenRouter returned an invalid edge");
        return { type: raw.type, edge: { id: edge.id, source: edge.source, target: edge.target, ...(typeof edge.label === "string" ? { label: edge.label.slice(0, 100) } : {}) } };
      }
      default: throw new Error("OpenRouter returned an unsupported canvas action");
    }
      })();
      actions.push(action);
    } catch (error) {
      skipped += 1;
      console.warn("[design-agent] Skipping invalid OpenRouter action", {
        index,
        type: record(raw) && typeof raw.type === "string" ? raw.type : null,
        reason: errorDetails(error).message,
      });
    }
  }
  if (actions.length === 0) throw new Error("OpenRouter plan did not contain any valid canvas actions");
  return { actions, skipped };
}

function extractJsonObject(text: string): string {
  const unfenced = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const start = unfenced.indexOf("{");
  if (start < 0) throw new Error("OpenRouter response did not contain a JSON object");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < unfenced.length; index += 1) {
    const character = unfenced[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return unfenced.slice(start, index + 1);
  }
  throw new Error("OpenRouter response contained incomplete JSON");
}

function compactCanvasContext(nodes: Record<string, unknown>, edges: Record<string, unknown>) {
  const compactNodes = Object.entries(nodes).slice(0, 50).flatMap(([id, value]) => {
    if (!record(value)) return [];
    const data = record(value.data) ? value.data : {};
    const position = record(value.position) ? value.position : {};
    return [{
      id,
      label: typeof data.label === "string" ? data.label.slice(0, 100) : "",
      shape: typeof data.shape === "string" ? data.shape : "rectangle",
      x: number(position.x) ? Math.round(position.x) : 100,
      y: number(position.y) ? Math.round(position.y) : 100,
    }];
  });
  const compactEdges = Object.entries(edges).slice(0, 80).flatMap(([id, value]) => {
    if (!record(value) || typeof value.source !== "string" || typeof value.target !== "string") return [];
    return [{ id, source: value.source, target: value.target, label: typeof value.label === "string" ? value.label.slice(0, 60) : "" }];
  });
  return { nodes: compactNodes, edges: compactEdges, omittedNodes: Math.max(0, Object.keys(nodes).length - compactNodes.length), omittedEdges: Math.max(0, Object.keys(edges).length - compactEdges.length) };
}

function enforceNodeSpacing(actions: DesignAction[], currentNodes: Record<string, unknown>) {
  const occupied: Array<{ x: number; y: number; width: number; height: number }> = [];
  for (const value of Object.values(currentNodes)) {
    if (!record(value) || !record(value.position)) continue;
    const { x, y } = value.position;
    if (!number(x) || !number(y)) continue;
    occupied.push({ x, y, width: number(value.width) ? value.width : 180, height: number(value.height) ? value.height : 100 });
  }
  for (const action of actions) {
    if (action.type !== "addNode") continue;
    const { node } = action;
    const width = node.width ?? 180;
    const height = node.height ?? 100;
    let attempts = 0;
    while (occupied.some((other) => node.x < other.x + other.width + 80 && node.x + width + 80 > other.x && node.y < other.y + other.height + 80 && node.y + height + 80 > other.y) && attempts < 100) {
      node.x += 260;
      if (node.x > 2200) {
        node.x = 100;
        node.y += 180;
      }
      attempts += 1;
    }
    occupied.push({ x: node.x, y: node.y, width, height });
  }
}

/** Arrange newly generated components by their data-flow depth, not model-picked coordinates. */
export function layoutGeneratedGraph(actions: DesignAction[], currentNodes: Record<string, unknown>) {
  const nodes = actions.flatMap((action) => action.type === "addNode" ? [action.node] : []);
  if (nodes.length < 2) return;
  const nodeIds = new Set(nodes.map((node) => node.id));
  const connectsToExisting = actions.some((action) => action.type === "addEdge" && (
    (currentNodes[action.edge.source] && !nodeIds.has(action.edge.source)) ||
    (currentNodes[action.edge.target] && !nodeIds.has(action.edge.target))
  ));
  if (connectsToExisting) return;
  const edges = actions.flatMap((action) => action.type === "addEdge" && nodeIds.has(action.edge.source) && nodeIds.has(action.edge.target)
    ? [{ source: action.edge.source, target: action.edge.target }]
    : []);
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }

  const depth = new Map<string, number>();
  const queue = nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
  for (const id of queue) depth.set(id, 0);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const source = queue[cursor];
    for (const target of outgoing.get(source) ?? []) {
      depth.set(target, Math.max(depth.get(target) ?? 0, (depth.get(source) ?? 0) + 1));
      incoming.set(target, (incoming.get(target) ?? 1) - 1);
      if (incoming.get(target) === 0) queue.push(target);
    }
  }
  // Cycles are common in bidirectional system diagrams. Keep unresolved nodes in
  // the final column so they remain visible instead of overlapping at (0, 0).
  const maxDepth = Math.max(0, ...depth.values());
  for (const node of nodes) {
    const column = depth.get(node.id) ?? maxDepth + 1;
    node.x = 100 + column * 300;
  }
  const columns = new Map<number, typeof nodes>();
  for (const node of nodes) {
    const column = depth.get(node.id) ?? maxDepth + 1;
    const group = columns.get(column) ?? [];
    group.push(node);
    columns.set(column, group);
  }
  for (const group of columns.values()) {
    group.forEach((node, index) => { node.y = 100 + index * 170; });
  }
  const existingBottom = Object.values(currentNodes).reduce<number>((bottom, value) => {
    if (!record(value) || !record(value.position) || !number(value.position.y)) return bottom;
    return Math.max(bottom, value.position.y + (number(value.height) ? value.height : 100));
  }, 0);
  if (existingBottom > 0) {
    for (const node of nodes) node.y += existingBottom + 260;
  }
}

async function publishStatus(roomId: string, message: string, state: "processing" | "retrying" | "complete" | "error") {
  const liveblocks = getLiveblocksClient();
  try {
    await liveblocks.getFeed({ roomId, feedId: AI_STATUS_FEED_ID });
  } catch {
    try {
      await liveblocks.createFeed({ roomId, feedId: AI_STATUS_FEED_ID });
    } catch {
      // Another task may have created the shared feed concurrently.
    }
  }
  const existing = await liveblocks.getFeedMessages({ roomId, feedId: AI_STATUS_FEED_ID });
  const newest = existing.data.reduce<typeof existing.data[number] | null>(
    (current, candidate) => !current || candidate.createdAt > current.createdAt ? candidate : current,
    null,
  );

  if (newest) {
    await liveblocks.updateFeedMessage({
      roomId,
      feedId: AI_STATUS_FEED_ID,
      messageId: newest.id,
      data: { state, text: message },
    });
    await Promise.all(
      existing.data
        .filter((feedMessage) => feedMessage.id !== newest.id)
        .map((feedMessage) => liveblocks.deleteFeedMessage({
          roomId,
          feedId: AI_STATUS_FEED_ID,
          messageId: feedMessage.id,
        })),
    );
    return;
  }

  await liveblocks.createFeedMessage({ roomId, feedId: AI_STATUS_FEED_ID, data: { state, text: message } });
}

function applyActions(flow: FlowMaps, actions: DesignAction[]) {
  let applied = 0;
  for (const action of actions) {
    if (action.type === "addNode") {
      const { node } = action;
      const color = node.color ?? NODE_COLORS[0].color;
      const palette = NODE_COLORS.find((entry) => entry.color === color) ?? NODE_COLORS[0];
      const id = node.id.slice(0, 80);
      if (!flow.nodes.has(id)) {
        flow.nodes.set(id, new LiveObject({
          id,
          type: "canvasNode",
          position: { x: node.x, y: node.y },
          width: node.width ?? 180,
          height: node.height ?? 100,
          data: new LiveObject({ label: node.label, shape: node.shape, color, textColor: palette.textColor }),
        }) as LiveblocksNode<CanvasNode>);
      }
      applied += 1;
    } else if (action.type === "addEdge") {
      const { edge } = action;
      if (flow.nodes.has(edge.source) && flow.nodes.has(edge.target) && !flow.edges.has(edge.id)) {
        const id = edge.id.slice(0, 80);
        flow.edges.set(id, new LiveObject({
          id,
          type: "canvasEdge",
          source: edge.source,
          target: edge.target,
          label: edge.label ?? "",
          data: new LiveObject(edge.label ? { label: edge.label } : {}),
        }) as LiveblocksEdge<CanvasEdge>);
      }
      applied += 1;
    } else if (action.type === "deleteEdge") {
      if (flow.edges.has(action.id)) flow.edges.delete(action.id);
      applied += 1;
    } else if (action.type === "deleteNode") {
      if (flow.nodes.has(action.id)) flow.nodes.delete(action.id);
      for (const [id, edge] of flow.edges) {
        if (edge.get("source") === action.id || edge.get("target") === action.id) flow.edges.delete(id);
      }
      applied += 1;
    } else {
      const node = flow.nodes.get(action.id);
      if (!node) continue;
      if (action.type === "moveNode") node.set("position", { x: action.x, y: action.y });
      if (action.type === "resizeNode") {
        node.set("width", action.width);
        node.set("height", action.height);
      }
      if (action.type === "updateNode") {
        const data = node.get("data");
        if (action.label !== undefined) data.set("label", action.label);
        if (action.shape !== undefined) data.set("shape", action.shape);
        if (action.color !== undefined && VALID_COLORS.includes(action.color)) {
          data.set("color", action.color);
          data.set("textColor", NODE_COLORS.find((entry) => entry.color === action.color)?.textColor ?? NODE_COLORS[0].textColor);
        }
      }
      applied += 1;
    }
  }
  return applied;
}

export const designAgent = task({
  id: "design-agent",
  maxDuration: 600,
  retry: {
    maxAttempts: 1,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 120_000,
    randomize: true,
  },
  catchError: () => ({ skipRetrying: true }),
  run: async ({ prompt, roomId }: DesignAgentPayload, { signal }) => {
    const liveblocks = getLiveblocksClient();
    let presenceSet = false;
    try {
      await liveblocks.setPresence(roomId, {
        userId: AI_ID,
        userInfo: { name: "Ghost AI", cursorColor: AI_COLOR },
        data: { cursor: { x: 0, y: 0 }, thinking: true },
        ttl: 3599,
      });
      presenceSet = true;
      await publishStatus(roomId, "Ghost AI started planning your design.", "processing").catch((statusError: unknown) => console.warn("[design-agent] Could not publish start status", errorDetails(statusError)));
      const apiKey = process.env.NVIDIA_OMNI_API_KEY;
      if (!apiKey) throw new Error("NVIDIA_OMNI_API_KEY is not configured");

      const current = await liveblocks.getStorageDocument(roomId, "json") as unknown as { flow?: { nodes?: Record<string, unknown>; edges?: Record<string, unknown> } };
      const nodes = current.flow?.nodes ?? {};
      const edges = current.flow?.edges ?? {};
      const canvasContext = compactCanvasContext(nodes, edges);
      await publishStatus(roomId, "Ghost AI is interpreting your prompt and current canvas.", "processing").catch((statusError: unknown) => console.warn("[design-agent] Could not publish processing status", errorDetails(statusError)));
      const { text, finishReason } = await generateDesignPlan(
        apiKey,
        `Return one compact JSON object only: {"actions":[...]}. Use enough actions (up to 32) to represent the requested architecture completely. For a new architecture, include every named component, essential supporting stores/queues, and directed, labeled edges showing the main request/data flow; do not leave components isolated unless the prompt says they are external. For a continuation, preserve existing components and connect additions to the relevant existing nodes. Do not invent unrelated services or substitute a different database than requested. Organize components in readable left-to-right layers (client/entry, application/services, async or shared infrastructure, persistence); put each component in one layer and avoid one long shared edge when separate labeled flows are clearer. The application code will lay out newly added nodes from their connections, so provide correct edge endpoints and meaningful labels. Do not include markdown, explanations, or reasoning. Allowed actions: addNode {node:{id,label,shape,x,y,width?,height?,color?}}, moveNode {id,x,y}, resizeNode {id,width,height}, updateNode {id,label?,shape?,color?}, deleteNode {id}, addEdge {edge:{id,source,target,label?}}, deleteEdge {id}. Shapes: rectangle, diamond, circle, pill, cylinder, hexagon. Colors: #1F1F1F, #10233D, #2E1938, #331B00, #3C1618, #3A1726, #0F2E18, #062822. Use existing IDs for edits and edge endpoints; use new ai- IDs for added nodes.`,
        `Request: ${prompt}\nCanvas: ${JSON.stringify(canvasContext)}`,
        signal,
        async (attempt, reason) => {
          const state = "retrying";
          const text = reason === "output_limit"
            ? `Nemotron used its first output budget. Retrying with less reasoning (${attempt}/${MAX_PROVIDER_ATTEMPTS - 1})...`
            : `OpenRouter is temporarily unavailable. Retrying generation (${attempt}/${MAX_PROVIDER_ATTEMPTS - 1})...`;
          await publishStatus(roomId, text, state).catch((statusError: unknown) => console.warn("[design-agent] Could not publish retry status", errorDetails(statusError)));
        },
      );
      let actions: DesignAction[];
      let skippedActions = 0;
      try {
        const jsonText = extractJsonObject(text);
        const parsed = parseActions(JSON.parse(jsonText) as unknown);
        actions = parsed.actions;
        skippedActions = parsed.skipped;
      } catch (error) {
        console.error("[design-agent] OpenRouter plan validation failed", {
          provider: "OpenRouter", model: OPENROUTER_MODEL,
          error: errorDetails(error), responseLength: text.length,
          finishReason: finishReason ?? null,
          likelyTruncated: finishReason === "length" || (error instanceof Error && error.message.includes("incomplete JSON")),
        });
        const taskError = new AbortTaskRunError("OpenRouter returned a design plan that could not be parsed or validated.");
        Object.assign(taskError, { cause: error });
        throw taskError;
      }
      layoutGeneratedGraph(actions, nodes);
      enforceNodeSpacing(actions, nodes);
      const firstChange = actions.find((action) => action.type === "addNode" || action.type === "moveNode");
      if (firstChange) {
        await liveblocks.setPresence(roomId, {
          userId: AI_ID,
          userInfo: { name: "Ghost AI", cursorColor: AI_COLOR },
          data: {
            cursor: {
              x: firstChange.type === "addNode" ? firstChange.node.x : firstChange.x,
              y: firstChange.type === "addNode" ? firstChange.node.y : firstChange.y,
            },
            thinking: true,
          },
          ttl: 3599,
        });
      }
      await publishStatus(roomId, `Ghost AI is applying ${actions.length} canvas updates.`, "processing").catch((statusError: unknown) => console.warn("[design-agent] Could not publish applying status", errorDetails(statusError)));
      let applied = 0;
      await liveblocks.mutateStorage(roomId, ({ root }) => {
        const flow = root.get("flow") as unknown as FlowStorage | undefined;
        if (!flow) throw new Error("Canvas storage is not initialized");
        applied = applyActions({ nodes: flow.get("nodes"), edges: flow.get("edges") }, actions);
      });
      const message = skippedActions > 0
        ? `Ghost AI completed the design with ${applied} canvas updates. ${skippedActions} invalid suggestion${skippedActions === 1 ? " was" : "s were"} skipped.`
        : `Ghost AI completed the design with ${applied} canvas updates.`;
      await publishStatus(roomId, message, "complete").catch((statusError: unknown) => console.warn("[design-agent] Could not publish completion status", errorDetails(statusError)));
      return { message, actionCount: applied, roomId };
    } catch (error) {
      console.error("[design-agent] Generation failed", errorDetails(error));
      const statusMessage = error instanceof AbortTaskRunError
          ? error.message
          : "Ghost AI could not complete the design. Please try again.";
      try { await publishStatus(roomId, statusMessage, "error"); } catch { /* Keep task error handling independent from status delivery. */ }
      throw error;
    } finally {
      if (presenceSet) {
        try {
          await liveblocks.setPresence(roomId, { userId: AI_ID, userInfo: { name: "Ghost AI", cursorColor: AI_COLOR }, data: { cursor: null, thinking: false }, ttl: 2 });
        } catch (error) {
          console.error("[design-agent] Could not clear AI presence", errorDetails(error));
        }
      }
    }
  },
});
