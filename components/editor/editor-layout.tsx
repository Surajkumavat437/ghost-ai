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
  const projectDialogs = useProjectDialogs()

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
        onCreate={projectDialogs.openCreate}
        onRename={projectDialogs.openRename}
        onDelete={projectDialogs.openDelete}
      />
      <main className="min-h-dvh pt-14">{children ?? <EditorHome onNewProject={projectDialogs.openCreate} />}</main>
      <ProjectDialogs
        dialog={projectDialogs.dialog}
        formName={projectDialogs.formName}
        onFormNameChange={projectDialogs.setFormName}
        slugPreview={projectDialogs.slugPreview}
        isLoading={projectDialogs.isLoading}
        onClose={projectDialogs.closeDialog}
        onSubmitName={projectDialogs.submitName}
        onConfirmDelete={projectDialogs.confirmDelete}
      />
    </div>
  )
}
