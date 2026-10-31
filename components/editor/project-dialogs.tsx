"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { ProjectDialogState } from "@/components/editor/use-project-dialogs"

interface ProjectDialogsProps {
  dialog: ProjectDialogState
  formName: string
  onFormNameChange: (name: string) => void
  slugPreview: string
  validationError: string
  isLoading: boolean
  onClose: () => void
  onSubmitName: () => void
  onConfirmDelete: () => void
}

export function ProjectDialogs({ dialog, formName, onFormNameChange, slugPreview, validationError, isLoading, onClose, onSubmitName, onConfirmDelete }: ProjectDialogsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [renderedDialog, setRenderedDialog] = useState(dialog)
  const [previousDialog, setPreviousDialog] = useState(dialog)

  if (dialog !== previousDialog) {
    setPreviousDialog(dialog)
    if (dialog) setRenderedDialog(dialog)
  }

  const isNameDialog = renderedDialog?.type === "create" || renderedDialog?.type === "rename"
  const hasRenameChanges = renderedDialog?.type === "rename" && formName.trim() !== renderedDialog.project.name

  useEffect(() => {
    if (renderedDialog?.type === "rename") inputRef.current?.focus()
  }, [renderedDialog])

  return (
    <Dialog
      open={dialog !== null}
      onOpenChange={(open) => { if (!open) onClose() }}
      onOpenChangeComplete={(open) => {
        if (!open && dialog === null) setRenderedDialog(null)
      }}
    >
      <DialogContent>
        {isNameDialog && (
          <form onSubmit={(event) => { event.preventDefault(); onSubmitName() }}>
            <DialogHeader>
              <DialogTitle>{renderedDialog.type === "create" ? "Create project" : "Rename project"}</DialogTitle>
              <DialogDescription>
                {renderedDialog.type === "create" ? "Choose a name for your new architecture workspace." : `Rename “${renderedDialog.project.name}”.`}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-3">
              <label htmlFor="project-name" className="text-sm font-medium text-copy-secondary">Project name</label>
              <Input className="text-white" ref={inputRef} autoFocus={renderedDialog.type === "rename"} id="project-name" value={formName} onChange={(event) => onFormNameChange(event.target.value)} placeholder="e.g. Payments Platform" required />
              {renderedDialog.type === "create" && (
                <div>
                  <p className="text-xs text-copy-muted">Slug preview: <span className="font-mono text-copy-secondary">{slugPreview || "project-name"}</span></p>
                </div>
              )}
              {validationError && <p className="text-xs text-state-error" role="alert">{validationError}</p>}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !formName.trim() || (renderedDialog.type === "rename" && !hasRenameChanges)}>{isLoading ? "Saving…" : renderedDialog.type === "create" ? "Create project" : "Save changes"}</Button>
            </DialogFooter>
            {validationError && <p className="text-xs text-state-error" role="alert">{validationError}</p>}
          </form>
        )}
        {renderedDialog?.type === "delete" && (
          <>
            <DialogHeader>
              <DialogTitle>Delete project?</DialogTitle>
              <DialogDescription>“{renderedDialog.project.name}” will be removed from your projects.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={isLoading} onClick={onConfirmDelete}>{isLoading ? "Deleting…" : "Delete project"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
