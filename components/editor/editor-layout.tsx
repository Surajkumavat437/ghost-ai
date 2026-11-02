"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Bot, Sparkles, X } from "lucide-react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { EditorHome } from "@/components/editor/editor-home"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ShareDialog } from "@/components/editor/share-dialog"
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
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const projectActions = useProjectActions(projects, activeProject?.id ?? null)

  return (
    <div className="min-h-dvh bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
        projectName={activeProject?.name}
        canManageSharing={activeProject?.owned ?? false}
        onShareClick={() => setIsShareDialogOpen(true)}
        onAiSidebarToggle={() => setIsAiSidebarOpen((open) => !open)}
        isAiSidebarOpen={isAiSidebarOpen}
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
      <main className={`min-h-dvh pt-14 transition-[padding] duration-300 motion-reduce:transition-none ${activeProject && isAiSidebarOpen ? "lg:pr-[23rem]" : ""}`}>
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
      {activeProject && isAiSidebarOpen && <>
        <button aria-label="Close AI panel" className="fixed inset-x-0 bottom-0 top-14 z-50 bg-base/75 backdrop-blur-sm lg:hidden" onClick={() => setIsAiSidebarOpen(false)} type="button" />
        <AiSidebarPlaceholder onClose={() => setIsAiSidebarOpen(false)} />
      </>}
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

function AiSidebarPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <aside aria-label="AI design agent" className="fixed bottom-3 left-3 right-3 top-[4.5rem] z-[60] flex flex-col overflow-hidden rounded-2xl border border-surface-border border-t-2 border-t-ai/50 bg-surface shadow-2xl shadow-base/60 sm:left-auto sm:right-4 sm:w-[min(22rem,calc(100vw-2rem))] lg:bottom-4 lg:z-30">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ai/20 bg-ai/10 text-ai-text"><Bot className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold text-copy-primary">Design agent</h2>
            <p className="mt-0.5 text-[11px] text-copy-muted">Architecture assistant</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-md border border-ai/15 bg-ai/5 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-ai-text">Preview</span>
          <button aria-label="Close AI panel" className="flex size-8 items-center justify-center rounded-lg text-copy-muted transition-colors hover:bg-subtle hover:text-copy-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={onClose} title="Close AI panel" type="button"><X className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="editor-ai-glow min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ai-text">
            <Sparkles className="h-3.5 w-3.5" />
            Your design partner
          </div>
          <h3 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-copy-primary">Start with a question.</h3>
          <p className="mt-2 text-[13px] leading-5 text-copy-muted">Explore components, connections, and tradeoffs as your system takes shape.</p>

          <div className="mt-5 rounded-xl border border-surface-border bg-base/75 p-3.5 sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-copy-faint">Example prompt</p>
            <p className="mt-2 text-[13px] leading-5 text-copy-secondary">“What are the key parts of a reliable system?”</p>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-ai/10 bg-ai/5 px-3 py-2.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ai" />
            <p className="text-[11px] leading-4 text-copy-muted">Agent chat is not connected yet. This space will hold your design conversation.</p>
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-2.5 border-t border-surface-border bg-surface px-4 py-3 text-[11px] text-copy-faint">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-copy-faint" />
        Preview mode
      </footer>
    </aside>
  )
}
