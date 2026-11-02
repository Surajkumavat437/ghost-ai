interface AdvisoryLockClient {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}

export async function acquireLiveblocksRoomLock(client: AdvisoryLockClient, roomId: string) {
  await client.$queryRaw<Array<{ locked: number }>>`
    WITH room_lock AS (
      SELECT pg_advisory_xact_lock(hashtextextended(${`ghost-ai:liveblocks-room:${roomId}`}, 0))
    )
    SELECT 1 AS locked FROM room_lock
  `;
}
