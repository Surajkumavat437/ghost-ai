import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { canAccessProject, getCurrentClerkIdentity } from "@/lib/project-access";

const MAX_SPEC_BYTES = 5 * 1024 * 1024;
const BLOB_DOWNLOAD_TIMEOUT_MS = 20_000;

interface SpecDownloadRouteContext {
  params: Promise<{ projectId: string; specId: string }>;
}

export async function GET(_request: Request, context: SpecDownloadRouteContext) {
  const { projectId, specId } = await context.params;
  const identity = await getCurrentClerkIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const project = await canAccessProject(identity.userId, identity.primaryEmail, projectId);
  if (!project) {
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    return exists
      ? Response.json({ error: "Forbidden" }, { status: 403 })
      : Response.json({ error: "Project not found" }, { status: 404 });
  }

  const spec = await prisma.projectSpec.findFirst({
    where: { id: specId, projectId: project.id },
    select: { filePath: true },
  });
  if (!spec) return Response.json({ error: "Spec not found" }, { status: 404 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Spec file storage is not configured on the server." }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BLOB_DOWNLOAD_TIMEOUT_MS);
  try {
    const blob = await get(spec.filePath, {
      access: "private",
      useCache: false,
      abortSignal: controller.signal,
    });
    if (!blob) return Response.json({ error: "Spec file not found" }, { status: 404 });
    if (blob.statusCode !== 200 || blob.blob.size > MAX_SPEC_BYTES) {
      return Response.json({ error: "Spec file is unavailable or too large" }, { status: 502 });
    }

    const content = await new Response(blob.stream).arrayBuffer();
    if (content.byteLength > MAX_SPEC_BYTES) {
      return Response.json({ error: "Spec file is too large" }, { status: 502 });
    }

    const safeSpecId = specId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "download";
    return new Response(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="spec-${safeSpecId}.md"`,
        "Content-Length": String(content.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    console.error("[spec-download] Blob read failed", {
      timedOut,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({
      error: timedOut
        ? "Downloading the spec timed out. Check the Blob connection and retry."
        : "Could not download the spec. Check the Blob storage configuration and retry.",
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
