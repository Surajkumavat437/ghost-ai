import { auth } from "@clerk/nextjs/server";

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
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  if (project.ownerId !== userId) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawEmail = typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).email
    : null;
  if (typeof rawEmail !== "string") return Response.json({ error: "Enter a valid email address" }, { status: 400 });

  const email = rawEmail.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  try {
    const collaborator = await prisma.projectCollaborator.create({ data: { projectId, email } });
    return Response.json({ collaborator: (await enrichCollaborators([collaborator]))[0] }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json({ error: "This person is already a collaborator" }, { status: 409 });
    }
    throw error;
  }
}
