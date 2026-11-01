"use client"

import { FolderOpen, FolderPlus, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { EditorProject } from "@/components/editor/use-project-dialogs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  projects: EditorProject[]
  selectedProjectId: string | null
  onCreate: () => void
  onSelect: (project: EditorProject) => void
  onRename: (project: EditorProject) => void
  onDelete: (project: EditorProject) => void
}

type ProjectListProps = Pick<ProjectSidebarProps, "projects" | "selectedProjectId" | "onSelect" | "onRename" | "onDelete">

function ProjectList({ projects, selectedProjectId, onSelect, onRename, onDelete }: ProjectListProps) {
  if (!projects.length) return <EmptyProjectsState />

  return (
    <ul className="space-y-1.5">
      {projects.map((project) => {
        const isSelected = project.id === selectedProjectId

        return (
          <li className={`group relative flex items-center gap-1 rounded-xl border px-2 py-1.5 transition-colors ${isSelected ? "border-brand/15 bg-accent-dim" : "border-transparent hover:border-surface-border hover:bg-elevated/70"}`} key={project.id}>
            {isSelected && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
            <button
              aria-current={isSelected ? "page" : undefined}
              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left ${isSelected ? "text-brand" : "text-copy-secondary"}`}
              onClick={() => onSelect(project)}
              type="button"
            >
              <FolderOpen className={`h-4 w-4 shrink-0 ${isSelected ? "text-brand" : "text-copy-faint"}`} />
              <span className="truncate text-[13px] font-medium">{project.name}</span>
              {isSelected && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
            </button>
            {project.owned && (
              <div className="flex shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <Button aria-label={`Rename ${project.name}`} className="text-copy-muted hover:text-copy-primary" onClick={() => onRename(project)} size="icon-xs" title={`Rename ${project.name}`} variant="ghost"><Pencil /></Button>
                <Button aria-label={`Delete ${project.name}`} className="text-copy-muted hover:text-state-error" onClick={() => onDelete(project)} size="icon-xs" title={`Delete ${project.name}`} variant="ghost"><Trash2 /></Button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function EmptyProjectsState() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-border bg-elevated text-copy-muted"><FolderPlus className="h-5 w-5" /></span>
      <p className="mt-4 text-sm font-medium text-copy-secondary">A little room to think</p>
      <p className="mt-1.5 max-w-48 text-xs leading-5 text-copy-muted">Create a project and your system designs will live here.</p>
    </div>
  )
}

export function ProjectSidebar({ isOpen, onClose, projects, selectedProjectId, onCreate, onSelect, onRename, onDelete }: ProjectSidebarProps) {
  const ownedProjects = projects.filter((project) => project.owned)
  const sharedProjects = projects.filter((project) => !project.owned)

  return (
    <>
      {isOpen && <button aria-label="Close projects sidebar" className="fixed inset-0 z-20 bg-base/75 backdrop-blur-sm md:hidden" onClick={onClose} type="button" />}
      <aside
        aria-hidden={!isOpen}
        aria-label="Projects sidebar"
        className={`fixed bottom-3 left-3 top-[4.5rem] z-30 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface/95 shadow-2xl shadow-base/60 backdrop-blur-xl transition-[translate,opacity] duration-300 ease-in-out motion-reduce:transition-none sm:bottom-4 sm:left-4 sm:w-[19rem] ${isOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-[calc(100%+1rem)] opacity-0"}`}
        inert={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copy-faint">Workspace</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium tabular-nums text-copy-muted">{projects.length}</span>
            </div>
          </div>
          <Button aria-label="Close projects sidebar" className="text-copy-muted" onClick={onClose} size="icon" title="Close projects" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="my-projects" className="flex min-h-0 flex-1 flex-col p-3.5">
          <TabsList className="h-9 w-full rounded-xl border border-surface-border bg-base/70 p-1">
            <TabsTrigger className="rounded-lg text-xs" value="my-projects">My projects <span className="ml-0.5 text-[10px] text-copy-faint">{ownedProjects.length}</span></TabsTrigger>
            <TabsTrigger className="rounded-lg text-xs" value="shared">Shared <span className="ml-0.5 text-[10px] text-copy-faint">{sharedProjects.length}</span></TabsTrigger>
          </TabsList>
          <TabsContent value="my-projects" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5">
            <ProjectList projects={ownedProjects} selectedProjectId={selectedProjectId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
          </TabsContent>
          <TabsContent value="shared" className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5">
            <ProjectList projects={sharedProjects} selectedProjectId={selectedProjectId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
          </TabsContent>
        </Tabs>

        <div className="border-t border-surface-border bg-base/30 p-3.5">
          <Button className="h-10 w-full rounded-xl shadow-[0_6px_22px_var(--accent-primary-dim)]" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-copy-faint"><Sparkles className="h-3 w-3" />A clear system starts with a question</p>
        </div>
      </aside>
    </>
  )
}
