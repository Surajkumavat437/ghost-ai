"use client"

import { Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { EditorProject } from "@/components/editor/use-project-dialogs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  projects: EditorProject[]
  onCreate: () => void
  onRename: (project: EditorProject) => void
  onDelete: (project: EditorProject) => void
}

function ProjectList({ projects, onRename, onDelete }: Pick<ProjectSidebarProps, "projects" | "onRename" | "onDelete">) {
  if (!projects.length) return <EmptyProjectsState />
  return (
    <ul className="space-y-1">
      {projects.map((project) => (
        <li key={project.id} className="group flex items-center gap-1 rounded-xl px-2 py-2 hover:bg-subtle">
          <button className="min-w-0 flex-1 truncate text-left text-sm text-copy-secondary" type="button">{project.name}</button>
          {project.owned && (
            <div className="flex shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Button aria-label={`Rename ${project.name}`} onClick={() => onRename(project)} size="icon-xs" variant="ghost"><Pencil /></Button>
              <Button aria-label={`Delete ${project.name}`} onClick={() => onDelete(project)} size="icon-xs" variant="ghost"><Trash2 /></Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function EmptyProjectsState() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-5 text-center">
      <p className="text-sm font-medium text-copy-secondary">No projects yet</p>
      <p className="mt-1 text-xs text-copy-muted">
        Your projects will appear here.
      </p>
    </div>
  )
}

export function ProjectSidebar({ isOpen, onClose, projects, onCreate, onRename, onDelete }: ProjectSidebarProps) {
  return (
    <>
      {isOpen && <button aria-label="Close projects sidebar" className="fixed inset-0 z-20 bg-base/65 backdrop-blur-[2px] md:hidden" onClick={onClose} />}
    <aside
      aria-hidden={!isOpen}
      aria-label="Projects sidebar"
      className={`fixed bottom-4 left-4 top-[4.5rem] z-30 flex w-[min(20rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 shadow-2xl backdrop-blur transition-[translate,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-full opacity-0"
      }`}
      inert={!isOpen}
    >
      <div className="flex h-14 items-center justify-between border-b border-surface-border px-4">
        <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
        <Button
          aria-label="Close projects sidebar"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="my-projects" className="flex min-h-0 flex-1 flex-col p-4">
        <TabsList className="w-full bg-subtle">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
        <TabsContent value="my-projects" className="mt-3 flex-1">
          <ProjectList projects={projects.filter((project) => project.owned)} onRename={onRename} onDelete={onDelete} />
        </TabsContent>
        <TabsContent value="shared" className="mt-3 flex-1">
          <ProjectList projects={projects.filter((project) => !project.owned)} onRename={onRename} onDelete={onDelete} />
        </TabsContent>
      </Tabs>

      <div className="border-t border-surface-border p-4">
        <Button className="w-full" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
    </>
  )
}
