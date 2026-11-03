"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Bot, ChevronRight, Layers3, PanelLeftClose, PanelLeftOpen, Share2, Workflow } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-save"

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((clerk) => clerk.UserButton),
  { ssr: false, loading: () => <span aria-hidden="true" className="size-8 shrink-0" /> },
)

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onSidebarToggle: () => void
  projectName?: string
  onStarterTemplatesClick?: () => void
  onAiSidebarToggle?: () => void
  isAiSidebarOpen?: boolean
  onShareClick?: () => void
  canManageSharing?: boolean
  onSave?: (traceId?: string) => void | Promise<boolean>
  saveStatus?: CanvasSaveStatus
  saveError?: string | null
}

export function EditorNavbar({ isSidebarOpen, onSidebarToggle, projectName, onStarterTemplatesClick, onAiSidebarToggle, isAiSidebarOpen = false, onShareClick, canManageSharing = false, onSave, saveStatus = "idle", saveError }: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen
  const handleSave = () => {
    if (!onSave) return
    const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const startedAt = performance.now()
    console.info("[canvas-save] save button clicked", { traceId })
    console.info("[canvas-save] save handler started", { traceId })
    void Promise.resolve(onSave(traceId)).then((saved) => {
      console.info("[canvas-save] save handler settled", { traceId, saved, durationMs: Math.round(performance.now() - startedAt) })
    }).catch((error: unknown) => {
      console.error("[canvas-save] save handler rejected", { traceId, name: error instanceof Error ? error.name : "UnknownError", durationMs: Math.round(performance.now() - startedAt) })
    })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-surface-border/80 bg-surface/90 px-2.5 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Button
          aria-label={isSidebarOpen ? "Close projects sidebar" : "Open projects sidebar"}
          aria-expanded={isSidebarOpen}
          className="shrink-0 text-copy-muted hover:text-copy-primary"
          onClick={onSidebarToggle}
          size="icon"
          title={isSidebarOpen ? "Close projects" : "Open projects"}
          variant="ghost"
        >
          <SidebarIcon className="h-[18px] w-[18px]" />
        </Button>
        <span aria-hidden="true" className="h-5 w-px bg-surface-border" />
        <Link aria-label="Ghost AI home" className="flex min-w-0 items-center gap-2" href="/editor">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-accent-dim text-brand shadow-[0_0_18px_var(--accent-primary-dim)]">
            <Workflow className="h-4 w-4" />
          </span>
          <span className="hidden text-[13px] font-semibold tracking-tight text-copy-primary sm:inline">Ghost AI</span>
        </Link>
        {projectName && <>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-copy-faint" />
          <span className="min-w-0 truncate text-[13px] font-medium text-copy-secondary sm:max-w-56">{projectName}</span>
        </>}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
        {projectName && <>
          <Button aria-label="Import starter template" className="text-copy-muted" onClick={onStarterTemplatesClick} size="icon" title="Import starter template" variant="ghost">
            <Layers3 className="h-4 w-4" />
          </Button>
          <Button aria-label="Share project" className="text-copy-muted" onClick={onShareClick} size="icon" title={canManageSharing ? "Share project" : "View collaborators"} variant="ghost">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            aria-label={isAiSidebarOpen ? "Close AI panel" : "Open AI panel"}
            aria-expanded={isAiSidebarOpen}
            aria-pressed={isAiSidebarOpen}
            className={isAiSidebarOpen ? "bg-ai/10 text-ai-text hover:bg-ai/15" : "text-copy-muted"}
            onClick={onAiSidebarToggle}
            size="icon"
            title={isAiSidebarOpen ? "Close AI panel" : "Open AI panel"}
            variant="ghost"
          >
            <Bot className="h-[18px] w-[18px]" />
          </Button>
          <Button type="button" variant="default" className="border-brand/30 bg-brand px-3 text-copy-on-brand shadow-sm shadow-brand/20 hover:bg-brand/90" onClick={handleSave} disabled={!onSave || saveStatus === "saving"} title={saveError ?? undefined} aria-label={saveError && saveStatus === "error" ? `Retry save: ${saveError}` : "Save canvas"}>
            {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Retry" : saveStatus === "saved" ? "Saved" : "Save"}
          </Button>
        </>}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-surface-border" />
        <UserButton
          appearance={{
            elements: {
              rootBox: "!w-fit !justify-end",
              avatarBox: "!size-8",
            },
          }}
        />
      </div>
    </header>
  )
}
