import { Sparkles, Workflow } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
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
    <EditorLayout projects={projects} activeProject={project}>
      <section aria-label={`${project.name} workspace`} className="h-[calc(100dvh-3.5rem)] min-h-[calc(100svh-3.5rem)] p-3 sm:p-4">
        <div className="editor-canvas-grid relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-surface-border bg-base">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--accent-primary)_5%,transparent),transparent_58%)]" />
          <div aria-hidden="true" className="absolute left-5 top-5 flex items-center gap-2 rounded-lg border border-surface-border bg-surface/80 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-copy-faint backdrop-blur sm:left-6 sm:top-6">
            <Workflow className="h-3.5 w-3.5 text-brand" />
            System canvas
          </div>
          <div className="relative mx-4 flex max-w-md flex-col items-center text-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-brand/20 bg-accent-dim text-brand shadow-lg shadow-brand/10 sm:h-[4.5rem] sm:w-[4.5rem]">
              <Workflow className="h-7 w-7 sm:h-8 sm:w-8" />
              <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-base bg-surface text-ai-text"><Sparkles className="h-3 w-3" /></span>
            </span>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">A fresh canvas</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-copy-primary sm:text-3xl">Your system starts here.</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-copy-muted sm:text-[15px] sm:leading-7">
              Map the services, data, and connections behind <span className="font-medium text-copy-secondary">{project.name}</span>. Your canvas tools will appear here soon.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface/80 px-3 py-1.5 text-[11px] text-copy-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_var(--accent-primary)]" />
              Workspace ready
            </div>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute bottom-5 right-5 hidden items-center gap-1.5 text-[10px] text-copy-faint sm:flex sm:bottom-6 sm:right-6">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Canvas preview
          </div>
        </div>
      </section>
    </EditorLayout>
  );
}
