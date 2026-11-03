import { get, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentClerkIdentity, canAccessProject } from "@/lib/project-access";
import { NODE_SHAPES } from "@/types/canvas";

const MAX_CANVAS_BYTES = 5 * 1024 * 1024;
const MAX_NODES = 10_000;
const MAX_EDGES = 20_000;
const BLOB_UPLOAD_TIMEOUT_MS = 20_000;
const BLOB_DOWNLOAD_TIMEOUT_MS = 20_000;

function getSafeBlobErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Blob error";
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return message
    .replace(/https?:\/\/[^\s"'`]+/g, "[Blob URL]")
    .replace(token ? new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g") : /$^/, "[redacted]")
    .slice(0, 300);
}

interface CanvasSnapshot {
  nodes: unknown[];
  edges: unknown[];
}

function isCanvasSnapshot(value: unknown): value is CanvasSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return Array.isArray(snapshot.nodes) && snapshot.nodes.length <= MAX_NODES &&
    snapshot.nodes.every(isCanvasNode) &&
    Array.isArray(snapshot.edges) && snapshot.edges.length <= MAX_EDGES &&
    snapshot.edges.every(isCanvasEdge);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCanvasNode(value: unknown) {
  if (!isRecord(value) || typeof value.id !== "string" || !isRecord(value.position) || !isRecord(value.data)) return false;
  const position = value.position;
  const data = value.data;
  return typeof position.x === "number" && Number.isFinite(position.x) &&
    typeof position.y === "number" && Number.isFinite(position.y) &&
    typeof data.label === "string" && typeof data.color === "string" &&
    NODE_SHAPES.some((shape) => shape === data.shape);
}

function isCanvasEdge(value: unknown) {
  return isRecord(value) && typeof value.id === "string" &&
    typeof value.source === "string" && typeof value.target === "string";
}

async function authorizeProject(projectId: string, traceId?: string) {
  const authStartedAt = performance.now();
  const identity = await getCurrentClerkIdentity();
  if (!identity) {
    if (traceId) console.warn("[canvas-save] authentication failed", { traceId });
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (traceId) console.info("[canvas-save] authentication completed", { traceId, durationMs: Math.round(performance.now() - authStartedAt) });
  const authorizationStartedAt = performance.now();
  const project = await canAccessProject(identity.userId, identity.primaryEmail, projectId);
  if (!project) {
    if (traceId) console.warn("[canvas-save] project authorization failed", { traceId });
    return { response: Response.json({ error: "Project not found" }, { status: 404 }) };
  }
  if (traceId) console.info("[canvas-save] project authorization completed", { traceId, durationMs: Math.round(performance.now() - authorizationStartedAt) });
  return { project };
}

export async function GET(_request: Request, context: RouteContext<"/api/projects/[projectId]/canvas">) {
  const { projectId } = await context.params;
  const access = await authorizeProject(projectId);
  if ("response" in access) return access.response;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { canvasJsonPath: true } });
  if (!project?.canvasJsonPath) return Response.json({ snapshot: null });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Canvas Blob storage is not configured on the server." }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BLOB_DOWNLOAD_TIMEOUT_MS);
  try {
    // Autosaves overwrite the project's snapshot, so bypass CDN cache and
    // always restore the latest persisted version.
    const blob = await get(project.canvasJsonPath, {
      access: "private",
      useCache: false,
      abortSignal: controller.signal,
    });
    if (!blob || blob.statusCode !== 200 || blob.blob.size > MAX_CANVAS_BYTES) {
      return Response.json({ error: "Saved canvas is unavailable" }, { status: 502 });
    }
    const body = await new Response(blob.stream).text();
    if (new TextEncoder().encode(body).byteLength > MAX_CANVAS_BYTES) {
      return Response.json({ error: "Saved canvas is too large" }, { status: 502 });
    }
    const snapshot: unknown = JSON.parse(body);
    if (!isCanvasSnapshot(snapshot)) return Response.json({ error: "Saved canvas is invalid" }, { status: 502 });
    return Response.json({ snapshot }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    console.error("[canvas-load] Blob read failed", {
      timedOut,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({
      error: timedOut
        ? "Loading the saved canvas timed out. Check the Blob connection and retry."
        : "Could not load the saved canvas. Check the Blob storage configuration and retry.",
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function PUT(request: Request, context: RouteContext<"/api/projects/[projectId]/canvas">) {
  const routeStartedAt = performance.now();
  const { projectId } = await context.params;
  const headerTraceId = request.headers.get("x-canvas-save-trace") ?? "missing";
  const traceId = /^[\w-]{1,80}$/.test(headerTraceId) ? headerTraceId : "invalid";
  console.info("[canvas-save] API route received PUT", { traceId });
  const access = await authorizeProject(projectId, traceId);
  if ("response" in access) return access.response;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[canvas-save] Blob token is not configured", { traceId });
    return Response.json({ error: "Canvas Blob storage is not configured on the server." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_CANVAS_BYTES) {
    return Response.json({ error: "Canvas payload is too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isCanvasSnapshot(body)) {
    console.warn("[canvas-save] payload validation failed", { traceId });
    return Response.json({ error: "Canvas must contain node and edge arrays" }, { status: 400 });
  }
  const validationStartedAt = performance.now();
  const json = JSON.stringify(body);
  if (new TextEncoder().encode(json).byteLength > MAX_CANVAS_BYTES) {
    console.warn("[canvas-save] payload size validation failed", { traceId });
    return Response.json({ error: "Canvas payload is too large" }, { status: 413 });
  }
  console.info("[canvas-save] payload validation completed", { traceId, durationMs: Math.round(performance.now() - validationStartedAt), bytes: new TextEncoder().encode(json).byteLength });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BLOB_UPLOAD_TIMEOUT_MS);
  const blobStartedAt = performance.now();
  let blobUrl: string;
  try {
    console.info("[canvas-save] Blob upload started", { traceId });
    const blob = await put(`canvas/${projectId}.json`, json, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
      abortSignal: controller.signal,
    });
    blobUrl = blob.url;
    console.info("[canvas-save] Blob upload completed", { traceId, durationMs: Math.round(performance.now() - blobStartedAt) });
  } catch (error) {
    const blobError = getSafeBlobErrorMessage(error);
    console.error("[canvas-save] Blob upload failed", {
      traceId,
      name: error instanceof Error ? error.name : "UnknownError",
      message: blobError,
    });
    const timedOut = controller.signal.aborted;
    return Response.json({ error: timedOut ? "Canvas upload timed out. Check the Blob connection and try again." : `Canvas upload failed: ${blobError}` }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  try {
    const prismaStartedAt = performance.now();
    await prisma.project.update({ where: { id: projectId }, data: { canvasJsonPath: blobUrl } });
    console.info("[canvas-save] Prisma project reference update completed", { traceId, durationMs: Math.round(performance.now() - prismaStartedAt), routeDurationMs: Math.round(performance.now() - routeStartedAt) });
    return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[canvas-save] Prisma project reference update failed", { traceId, name: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "Canvas uploaded, but its project reference could not be saved. Retry the save." }, { status: 500 });
  }
}
