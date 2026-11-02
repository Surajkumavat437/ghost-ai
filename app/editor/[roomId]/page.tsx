import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { CollaborativeCanvas } from "@/components/editor/collaborative-canvas";
import { EditorLayout } from "@/components/editor/editor-layout";
import { getAccessibleProject, getAccessibleProjects } from "@/lib/projects";

export const instant = false;

export default async function ProjectEditorPage({
  params,
}: PageProps<"/editor/[roomId]">) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { roomId } = await params;
  const [projects, project] = await Promise.all([
    getAccessibleProjects(userId),
    getAccessibleProject(userId, roomId),
  ]);

  if (!project) return <AccessDenied />;

  return (
    <EditorLayout key={project.id} projects={projects} activeProject={project}>
      <section aria-label={`${project.name} workspace`} className="h-full min-h-0 min-w-0 overflow-hidden">
        <div className="relative h-full min-h-0 w-full overflow-hidden bg-base">
          <CollaborativeCanvas roomId={project.id} />
        </div>
      </section>
    </EditorLayout>
  );
}
