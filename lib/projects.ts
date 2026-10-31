import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export interface AccessibleProject {
  id: string;
  name: string;
  owned: boolean;
}

export async function getAccessibleProjects(userId: string) {
  const user = await currentUser();
  const email = user?.id === userId ? user.primaryEmailAddress?.emailAddress : undefined;
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        ...(email ? [{ collaborators: { some: { email } } }] : []),
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
  const user = await currentUser();
  const email = user?.id === userId ? user.primaryEmailAddress?.emailAddress : undefined;
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        ...(email ? [{ collaborators: { some: { email } } }] : []),
      ],
    },
    select: { id: true, name: true, ownerId: true },
  });

  if (!project) return null;
  return { id: project.id, name: project.name, owned: project.ownerId === userId };
}
