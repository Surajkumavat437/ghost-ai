import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isPrismaRecordNotFoundError } from "@/lib/prisma-errors";
import { deleteOwnedProject } from "@/lib/project-mutations";
import { validateProjectName } from "@/lib/project-validation";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]">,
) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const validation = validateProjectName((body as Record<string, unknown>).name);
  if (!validation.name) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let updatedProject;
  try {
    updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { name: validation.name },
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    throw error;
  }

  return Response.json(updatedProject);
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]">,
) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const result = await deleteOwnedProject(prisma.project, projectId, userId);
  if (result === "not-found") {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  if (result === "forbidden") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return new Response(null, { status: 204 });
}
