import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { EditorLayout } from "@/components/editor/editor-layout";
import { getAccessibleProject, getAccessibleProjects } from "@/lib/projects";

export const instant = false;

export default async function ProjectEditorPage({
  params,
}: PageProps<"/editor/[projectId]">) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const [projects, project] = await Promise.all([
    getAccessibleProjects(userId),
    getAccessibleProject(userId, projectId),
  ]);

  if (!project) notFound();

  return (
    <EditorLayout projects={projects} activeProject={project}>
      <section
        aria-label={`${project.name} workspace`}
        className="flex min-h-[calc(100dvh-3.5rem)] flex-col px-6 py-8"
      >
        <h1 className="text-xl font-semibold tracking-tight text-copy-primary sm:text-2xl">
          {project.name}
        </h1>
        <p className="mt-2 text-sm text-copy-muted">Project workspace</p>
      </section>
    </EditorLayout>
  );
}
