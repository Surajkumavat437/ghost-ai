"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { EditorHome } from "@/components/editor/editor-home"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import type { EditorProject } from "@/components/editor/use-project-dialogs"
import { useProjectActions } from "@/hooks/use-project-actions"

interface EditorLayoutProps {
  children?: ReactNode
  projects: EditorProject[]
  activeProject?: EditorProject | null
}

export function EditorLayout({ children, projects, activeProject = null }: EditorLayoutProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const projectActions = useProjectActions(projects, activeProject?.id ?? null)

  return (
    <div className="min-h-dvh bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={projectActions.projects}
        selectedProjectId={activeProject?.id ?? null}
        onCreate={projectActions.openCreate}
        onSelect={(project) => {
          setIsSidebarOpen(false)
          router.push(`/editor/${encodeURIComponent(project.id)}`)
        }}
        onRename={projectActions.openRename}
        onDelete={projectActions.openDelete}
      />
      <main className="min-h-dvh pt-14">
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
    </div>
  )
}
