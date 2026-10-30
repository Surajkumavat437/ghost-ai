"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

export function EditorHome({ onNewProject }: { onNewProject: () => void }) {
  return (
    <section className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-copy-primary sm:text-2xl">Create a project or open an existing one</h1>
      <p className="mt-3 max-w-md text-sm text-copy-muted">Start a new architecture workspace, or choose a project from the sidebar.</p>
      <Button className="mt-6" onClick={onNewProject}><Plus className="h-4 w-4" />New Project</Button>
    </section>
  )
}
