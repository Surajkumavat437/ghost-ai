"use client"

import { useState, type ReactNode } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { EditorHome } from "@/components/editor/editor-home"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { useProjectDialogs } from "@/components/editor/use-project-dialogs"

interface EditorLayoutProps {
  children?: ReactNode
}

export function EditorLayout({ children }: EditorLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const projectDialogs = useProjectDialogs()
  const activeProject = projectDialogs.projects.find((project) => project.id === activeProjectId)

  return (
    <div className="min-h-dvh bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={projectDialogs.projects}
        selectedProjectId={activeProjectId}
        onCreate={projectDialogs.openCreate}
        onSelect={(project) => {
          setActiveProjectId(project.id)
          setIsSidebarOpen(false)
        }}
        onRename={projectDialogs.openRename}
        onDelete={projectDialogs.openDelete}
      />
      <main className="min-h-dvh pt-14">
        {children ?? (
          activeProject ? (
            <section aria-label={`${activeProject.name} workspace`} className="flex min-h-[calc(100dvh-3.5rem)] flex-col px-6 py-8">
              <h1 className="text-xl font-semibold tracking-tight text-copy-primary sm:text-2xl">{activeProject.name}</h1>
              <p className="mt-2 text-sm text-copy-muted">Project workspace</p>
            </section>
          ) : (
            <EditorHome onNewProject={projectDialogs.openCreate} />
          )
        )}
      </main>
      <ProjectDialogs
        dialog={projectDialogs.dialog}
        formName={projectDialogs.formName}
        onFormNameChange={projectDialogs.setFormName}
        slugPreview={projectDialogs.slugPreview}
        validationError={projectDialogs.validationError}
        isLoading={projectDialogs.isLoading}
        onClose={projectDialogs.closeDialog}
        onSubmitName={projectDialogs.submitName}
        onConfirmDelete={projectDialogs.confirmDelete}
      />
    </div>
  )
}
