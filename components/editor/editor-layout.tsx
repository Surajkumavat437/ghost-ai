"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { EditorHome } from "@/components/editor/editor-home"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ShareDialog } from "@/components/editor/share-dialog"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { StarterTemplatesProvider, useStarterTemplates } from "@/components/editor/starter-templates-context"
import type { EditorProject } from "@/components/editor/use-project-dialogs"
import { useProjectActions } from "@/hooks/use-project-actions"
import { WorkspaceSaveProvider, useWorkspaceSave } from "@/components/editor/workspace-save-context"

interface EditorLayoutProps {
  children?: ReactNode
  projects: EditorProject[]
  activeProject?: EditorProject | null
  specs?: { id: string; createdAt: string; filename: string }[]
}

export function EditorLayout({ children, projects, activeProject = null, specs = [] }: EditorLayoutProps) {
  return (
    <StarterTemplatesProvider>
      <WorkspaceSaveProvider>
      <EditorLayoutContent projects={projects} activeProject={activeProject} specs={specs}>{children}</EditorLayoutContent>
      </WorkspaceSaveProvider>
    </StarterTemplatesProvider>
  )
}

function EditorLayoutContent({ children, projects, activeProject = null, specs = [] }: EditorLayoutProps) {
  const workspaceSave = useWorkspaceSave()
  const router = useRouter()
  const { openStarterTemplates } = useStarterTemplates()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const projectActions = useProjectActions(projects, activeProject?.id ?? null)

  return (
    <div className="min-h-dvh bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
        projectName={activeProject?.name}
        onStarterTemplatesClick={openStarterTemplates}
        canManageSharing={activeProject?.owned ?? false}
        onShareClick={() => setIsShareDialogOpen(true)}
        onAiSidebarToggle={() => setIsAiSidebarOpen((open) => !open)}
        isAiSidebarOpen={isAiSidebarOpen}
        onSave={activeProject ? workspaceSave.onSave : undefined}
        saveStatus={workspaceSave.saveStatus}
        saveError={workspaceSave.saveError}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={projectActions.projects}
        selectedProjectId={activeProject?.id ?? null}
        onCreate={projectActions.openCreate}
        onSelect={(project) => {
          setIsSidebarOpen(false)
          setIsAiSidebarOpen(false)
          setIsShareDialogOpen(false)
          router.push(`/editor/${encodeURIComponent(project.id)}`)
        }}
        onRename={projectActions.openRename}
        onDelete={projectActions.openDelete}
      />
      <main className={activeProject ? "fixed inset-x-0 bottom-0 top-14 overflow-hidden" : "min-h-dvh pt-14"}>
        {children ?? (
          activeProject ? (
            <section aria-label={`${activeProject.name} workspace`} className="flex min-h-[calc(100dvh-3.5rem)] flex-col px-6 py-8">
              <h1 className="text-xl font-semibold tracking-tight text-copy-primary sm:text-2xl">{activeProject.name}</h1>
              <p className="mt-2 text-sm text-copy-muted">Project workspace</p>
            </section>
          ) : (
          <EditorHome onNewProject={projectActions.openCreate} />
          )
        )}
      </main>
      {activeProject && <AiSidebar isOpen={isAiSidebarOpen} onClose={() => setIsAiSidebarOpen(false)} projectId={activeProject.id} specs={specs} />}
      <ProjectDialogs
        dialog={projectActions.dialog}
        formName={projectActions.formName}
        onFormNameChange={projectActions.setFormName}
        slugPreview={projectActions.slugPreview}
        validationError={projectActions.validationError}
        isLoading={projectActions.isLoading}
        onClose={projectActions.closeDialog}
        onSubmitName={projectActions.submitName}
        onConfirmDelete={projectActions.confirmDelete}
      />
      {activeProject && <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        projectId={activeProject.id}
        projectName={activeProject.name}
        canManage={activeProject.owned}
      />}
    </div>
  )
}
