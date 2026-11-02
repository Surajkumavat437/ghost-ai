import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string; collaboratorId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, collaboratorId } = await context.params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  if (project.ownerId !== userId) return Response.json({ error: "Forbidden" }, { status: 403 });

  const result = await prisma.projectCollaborator.deleteMany({ where: { id: collaboratorId, projectId } });
  if (result.count === 0) return Response.json({ error: "Collaborator not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
