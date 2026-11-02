import { auth } from "@clerk/nextjs/server";

import { addProjectCollaboratorAsOwner } from "@/lib/add-project-collaborator";
import { enrichCollaborators } from "@/lib/project-collaborators";
import { getAccessibleProject } from "@/lib/projects";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const project = await getAccessibleProject(userId, projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return Response.json({ collaborators: await enrichCollaborators(collaborators), canManage: project.owned });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  return addProjectCollaboratorAsOwner(request, projectId, userId, {
    findProjectOwner: (id) => prisma.project.findUnique({ where: { id }, select: { ownerId: true } }),
    createCollaborator: (id, email) => prisma.projectCollaborator.create({ data: { projectId: id, email } }),
    async enrichCollaborator(collaborator) {
      const [enriched] = await enrichCollaborators([collaborator]);
      if (!enriched) throw new Error("Unable to enrich the new collaborator");
      return enriched;
    },
  });
}
