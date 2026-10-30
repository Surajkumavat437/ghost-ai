"use client"

import { useMemo, useState } from "react"

export interface EditorProject {
  id: string
  name: string
  slug: string
  owned: boolean
}

export type ProjectDialogState =
  | { type: "create" }
  | { type: "rename"; project: EditorProject }
  | { type: "delete"; project: EditorProject }
  | null

const initialProjects: EditorProject[] = [
  { id: "project-1", name: "Payments Platform", slug: "payments-platform", owned: true },
  { id: "project-2", name: "Realtime Chat", slug: "realtime-chat", owned: true },
  { id: "project-3", name: "Analytics Pipeline", slug: "analytics-pipeline", owned: false },
]

export function createProjectSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function useProjectDialogs() {
  const [projects, setProjects] = useState(initialProjects)
  const [dialog, setDialog] = useState<ProjectDialogState>(null)
  const [formName, setFormName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const slugPreview = useMemo(() => createProjectSlug(formName), [formName])

  function openCreate() {
    setFormName("")
    setDialog({ type: "create" })
  }

  function openRename(project: EditorProject) {
    setFormName(project.name)
    setDialog({ type: "rename", project })
  }

  function openDelete(project: EditorProject) {
    setFormName("")
    setDialog({ type: "delete", project })
  }

  function closeDialog() {
    if (!isLoading) setDialog(null)
  }

  function submitName() {
    if (!dialog || dialog.type === "delete" || !formName.trim()) return
    setIsLoading(true)
    if (dialog.type === "create") {
      const slug = createProjectSlug(formName)
      if (slug) {
        setProjects((current) => [
          { id: `project-${Date.now()}`, name: formName.trim(), slug, owned: true },
          ...current,
        ])
      }
    } else {
      const name = formName.trim()
      setProjects((current) => current.map((project) =>
        project.id === dialog.project.id ? { ...project, name, slug: createProjectSlug(name) } : project
      ))
    }
    setDialog(null)
    setIsLoading(false)
  }

  function confirmDelete() {
    if (!dialog || dialog.type !== "delete") return
    setIsLoading(true)
    setProjects((current) => current.filter((project) => project.id !== dialog.project.id))
    setDialog(null)
    setIsLoading(false)
  }

  return {
    projects,
    dialog,
    formName,
    setFormName,
    slugPreview,
    isLoading,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    submitName,
    confirmDelete,
  }
}
