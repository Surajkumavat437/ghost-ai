CREATE TABLE "project_spec" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_spec_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_spec_project_id_created_at_idx" ON "project_spec"("project_id", "created_at");

ALTER TABLE "project_spec"
ADD CONSTRAINT "project_spec_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
