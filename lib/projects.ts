import { prisma } from "@/lib/prisma";
import { getVerifiedCollaboratorEmails } from "@/lib/project-access";

export interface AccessibleProject {
  id: string;
  name: string;
  owned: boolean;
}

export async function getAccessibleProjects(userId: string) {
  const emails = await getVerifiedCollaboratorEmails(userId);
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        ...(emails.length
          ? [{ collaborators: { some: { email: { in: emails, mode: "insensitive" as const } } } }]
          : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, ownerId: true },
  });

  return projects.map(({ id, name, ownerId }) => ({
    id,
    name,
    owned: ownerId === userId,
  }));
}

export async function getAccessibleProject(userId: string, projectId: string) {
  const emails = await getVerifiedCollaboratorEmails(userId);
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        ...(emails.length
          ? [{ collaborators: { some: { email: { in: emails, mode: "insensitive" as const } } } }]
          : []),
      ],
    },
    select: { id: true, name: true, ownerId: true },
  });

  if (!project) return null;
  return { id: project.id, name: project.name, owned: project.ownerId === userId };
}
