import { acquireLiveblocksRoomLock } from "@/lib/liveblocks-room-lock";

interface ProjectDeleteDelegate {
  deleteMany(args: {
    where: { id: string; ownerId: string };
  }): Promise<{ count: number }>;
  findUnique(args: {
    where: { id: string };
    select: { ownerId: true };
  }): Promise<{ ownerId: string } | null>;
}

export interface ProjectDeleteTransaction {
  project: ProjectDeleteDelegate;
  liveblocksRoomCleanup: {
    upsert(args: {
      where: { roomId: string };
      create: { roomId: string };
      update: {
        status: "PENDING";
        attempts: 0;
        nextAttemptAt: Date;
        lockedAt: null;
        lockToken: null;
        completedAt: null;
        lastError: null;
      };
    }): Promise<unknown>;
  };
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}

export interface ProjectDeleteDatabase<Transaction extends ProjectDeleteTransaction> {
  $transaction<Result>(callback: (transaction: Transaction) => Promise<Result>): Promise<Result>;
}

export type DeleteProjectResult = "deleted" | "forbidden" | "not-found";

export async function deleteOwnedProject(
  database: ProjectDeleteDatabase<ProjectDeleteTransaction>,
  projectId: string,
  userId: string,
): Promise<DeleteProjectResult> {
  return database.$transaction(async (transaction) => {
    await acquireLiveblocksRoomLock(transaction, projectId);

    const result = await transaction.project.deleteMany({
      where: { id: projectId, ownerId: userId },
    });

    if (result.count > 0) {
      await transaction.liveblocksRoomCleanup.upsert({
        where: { roomId: projectId },
        create: { roomId: projectId },
        update: {
          status: "PENDING",
          attempts: 0,
          nextAttemptAt: new Date(),
          lockedAt: null,
          lockToken: null,
          completedAt: null,
          lastError: null,
        },
      });
      return "deleted";
    }

    const project = await transaction.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (!project) return "not-found";
    return "forbidden";
  });
}
