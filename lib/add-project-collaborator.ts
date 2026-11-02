import type { ProjectCollaborator } from "@/lib/generated/prisma/client";
import type { CollaboratorProfile } from "@/lib/project-collaborators";

interface AddCollaboratorDependencies {
  findProjectOwner(projectId: string): Promise<{ ownerId: string } | null>;
  createCollaborator(projectId: string, email: string): Promise<ProjectCollaborator>;
  enrichCollaborator(collaborator: ProjectCollaborator): Promise<CollaboratorProfile>;
}

export async function addProjectCollaboratorAsOwner(
  request: Request,
  projectId: string,
  userId: string,
  dependencies: AddCollaboratorDependencies,
): Promise<Response> {
  const project = await dependencies.findProjectOwner(projectId);
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
    const collaborator = await dependencies.createCollaborator(projectId, email);
    return Response.json({ collaborator: await dependencies.enrichCollaborator(collaborator) }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") {
        return Response.json({ error: "This person is already a collaborator" }, { status: 409 });
      }
      if (error.code === "P2003") {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }
    }
    throw error;
  }
}
