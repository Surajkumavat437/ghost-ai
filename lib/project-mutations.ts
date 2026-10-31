interface ProjectDeleteDelegate {
  deleteMany(args: {
    where: { id: string; ownerId: string };
  }): Promise<{ count: number }>;
  findUnique(args: {
    where: { id: string };
    select: { ownerId: true };
  }): Promise<{ ownerId: string } | null>;
}

export type DeleteProjectResult = "deleted" | "forbidden" | "not-found";

export async function deleteOwnedProject(
  projects: ProjectDeleteDelegate,
  projectId: string,
  userId: string,
): Promise<DeleteProjectResult> {
  const result = await projects.deleteMany({
    where: { id: projectId, ownerId: userId },
  });

  if (result.count > 0) return "deleted";

  const project = await projects.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) return "not-found";
  return "forbidden";
}
