"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Check, Copy, LoaderCircle, MailPlus, Share2, Trash2, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Collaborator {
  id: string
  email: string
  createdAt: string
  displayName: string | null
  avatarUrl: string | null
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  canManage: boolean
}

export function ShareDialog({ open, onOpenChange, projectId, projectName, canManage }: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCollaboratorRefreshFailed, setIsCollaboratorRefreshFailed] = useState(false)

  const loadCollaborators = useCallback(async (signal?: AbortSignal, showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
      setError(null)
      setIsCollaboratorRefreshFailed(false)
    }
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/collaborators`, { signal })
      const result = await response.json() as { collaborators?: Collaborator[]; error?: string }
      if (!response.ok) throw new Error(result.error ?? "Could not load collaborators")
      setCollaborators(result.collaborators ?? [])
      setIsCollaboratorRefreshFailed(false)
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return
      setError(requestError instanceof Error ? requestError.message : "Could not load collaborators")
      setIsCollaboratorRefreshFailed(true)
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    async function refreshOnOpen() {
      setIsLoading(true)
      setIsCollaboratorRefreshFailed(false)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/collaborators`, { signal: controller.signal })
        const result = await response.json() as { collaborators?: Collaborator[]; error?: string }
        if (!response.ok) throw new Error(result.error ?? "Could not load collaborators")
        setCollaborators(result.collaborators ?? [])
        setError(null)
        setIsCollaboratorRefreshFailed(false)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(requestError instanceof Error ? requestError.message : "Could not load collaborators")
        setIsCollaboratorRefreshFailed(true)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void refreshOnOpen()
    return () => controller.abort()
  }, [open, projectId])

  useEffect(() => {
    if (!isCopied) return
    const timeout = window.setTimeout(() => setIsCopied(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [isCopied])

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsInviting(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? "Could not invite collaborator")
      setEmail("")
      await loadCollaborators()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not invite collaborator")
    } finally {
      setIsInviting(false)
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    setRemovingId(collaboratorId)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/collaborators/${encodeURIComponent(collaboratorId)}`, { method: "DELETE" })
      if (!response.ok) {
        const result = await response.json() as { error?: string }
        throw new Error(result.error ?? "Could not remove collaborator")
      }
      setCollaborators((current) => current.filter(({ id }) => id !== collaboratorId))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not remove collaborator")
    } finally {
      setRemovingId(null)
    }
  }

  async function copyProjectLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/editor/${encodeURIComponent(projectId)}`)
      setIsCopied(true)
      setError(null)
    } catch {
      setError("Could not copy the project link. Check your browser permissions and try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setIsLoading(true)
      if (nextOpen) setError(null)
      onOpenChange(nextOpen)
    }}>
      <DialogContent className="max-h-[min(85dvh,42rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-surface-border px-5 py-5 pr-12 sm:px-6">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-brand/15 bg-accent-dim text-brand">
            <Share2 className="size-[18px]" />
          </div>
          <DialogTitle>Share {projectName}</DialogTitle>
          <DialogDescription className="mt-1">Collaborate with people on this project.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {canManage && <>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={inviteCollaborator}>
              <label className="sr-only" htmlFor="collaborator-email">Email address</label>
              <Input
                autoComplete="email"
                className="h-10 min-w-0 flex-1 bg-base/60 text-sm"
                id="collaborator-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                type="email"
                value={email}
              />
              <Button className="h-10 gap-2 sm:w-auto" disabled={isInviting || !email.trim()} type="submit">
                {isInviting ? <LoaderCircle className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
                Invite
              </Button>
            </form>
            <p className="mt-2 text-xs leading-5 text-copy-faint">They can access this project after signing in with this email address.</p>
          </>}

          <div className={canManage ? "mt-6" : ""}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold text-copy-secondary">People with access</h3>
              <span className="rounded-full border border-surface-border bg-subtle px-2 py-0.5 text-[10px] tabular-nums text-copy-muted">
                {isLoading ? "Updating…" : isCollaboratorRefreshFailed ? "Unavailable" : `${collaborators.length} ${collaborators.length === 1 ? "person" : "people"}`}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-surface-border bg-base/45">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-copy-muted"><LoaderCircle className="size-4 animate-spin" />Loading collaborators</div>
              ) : isCollaboratorRefreshFailed ? (
                <div className="px-4 py-8 text-center text-xs text-copy-muted">Collaborator list could not be verified.</div>
              ) : collaborators.length ? (
                <ul className="divide-y divide-surface-border">
                  {collaborators.map((collaborator) => (
                    <li className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4" key={collaborator.id}>
                      <CollaboratorAvatar collaborator={collaborator} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-copy-primary">{collaborator.displayName || collaborator.email}</p>
                        {collaborator.displayName && <p className="truncate text-xs text-copy-muted">{collaborator.email}</p>}
                      </div>
                      {canManage && <Button
                        aria-label={`Remove ${collaborator.displayName || collaborator.email}`}
                        className="size-8 text-copy-faint hover:text-destructive"
                        disabled={removingId === collaborator.id}
                        onClick={() => void removeCollaborator(collaborator.id)}
                        size="icon"
                        title="Remove access"
                        variant="ghost"
                      >
                        {removingId === collaborator.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <span className="mb-2 flex size-9 items-center justify-center rounded-xl bg-subtle text-copy-faint"><Users className="size-4" /></span>
                  <p className="text-xs font-medium text-copy-secondary">No collaborators yet</p>
                  <p className="mt-1 text-[11px] text-copy-faint">{canManage ? "Invite someone to work on this project." : "No one else has access to this project."}</p>
                </div>
              )}
            </div>
          </div>
          {error && <p aria-live="polite" className="mt-3 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        </div>

        {canManage && <div className="flex flex-col gap-3 border-t border-surface-border bg-surface/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-copy-secondary">Project link</p>
            <p className="mt-0.5 truncate text-[11px] text-copy-faint">Anyone with access can open this workspace.</p>
          </div>
          <Button className="shrink-0 gap-2" onClick={() => void copyProjectLink()} size="sm" type="button" variant={isCopied ? "secondary" : "outline"}>
            {isCopied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {isCopied ? "Copied!" : "Copy link"}
          </Button>
        </div>}
      </DialogContent>
    </Dialog>
  )
}

function CollaboratorAvatar({ collaborator }: { collaborator: Collaborator }) {
  const initials = (collaborator.displayName || collaborator.email).slice(0, 1).toUpperCase()
  return (
    <span
      aria-label={collaborator.displayName || collaborator.email}
      className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-subtle bg-cover bg-center text-xs font-semibold text-copy-secondary"
      role="img"
      style={collaborator.avatarUrl ? { backgroundImage: `url(${JSON.stringify(collaborator.avatarUrl)})` } : undefined}
    >
      {!collaborator.avatarUrl && initials}
    </span>
  )
}
