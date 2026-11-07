CREATE TABLE "task_run" (
    "run_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_run_pkey" PRIMARY KEY ("run_id")
);

CREATE INDEX "task_run_user_id_project_id_idx" ON "task_run"("user_id", "project_id");

ALTER TABLE "task_run"
ADD CONSTRAINT "task_run_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
