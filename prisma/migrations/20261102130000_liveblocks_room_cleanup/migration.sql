-- This table deliberately has no foreign key to Project so cleanup survives deletion.
CREATE TYPE "LiveblocksRoomCleanupStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED');

CREATE TABLE "liveblocks_room_cleanup" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "status" "LiveblocksRoomCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "lock_token" UUID,
    "completed_at" TIMESTAMP(3),
    "last_error" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liveblocks_room_cleanup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "liveblocks_room_cleanup_room_id_key" ON "liveblocks_room_cleanup"("room_id");
CREATE INDEX "liveblocks_room_cleanup_status_next_attempt_at_locked_at_idx"
    ON "liveblocks_room_cleanup"("status", "next_attempt_at", "locked_at");
