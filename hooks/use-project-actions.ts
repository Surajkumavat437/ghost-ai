"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { EditorProject, ProjectDialogState } from "@/components/editor/use-project-dialogs";
import { createProjectSlug } from "@/components/editor/use-project-dialogs";

interface ApiProject {
  id: string;
  name: string;
}

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = body.error;
    if (typeof error === "string") return error;
  }
  return `Request failed (${response.status}).`;
}

export function useProjectActions(initialProjects: EditorProject[], activeProjectId: string | null) {
  const router = useRouter();
  const [dialog, setDialog] = useState<ProjectDialogState>(null);
  const [formName, setFormName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const slugPreview = useMemo(() => createProjectSlug(formName), [formName]);

  function updateFormName(name: string) {
    setFormName(name);
    setValidationError("");
  }

  function openCreate() {
    setFormName("");
    setValidationError("");
    setDialog({ type: "create" });
  }

  function openRename(project: EditorProject) {
    setFormName(project.name);
    setValidationError("");
    setDialog({ type: "rename", project });
  }

  function openDelete(project: EditorProject) {
    setFormName("");
    setValidationError("");
    setDialog({ type: "delete", project });
  }

  function closeDialog() {
    if (!isLoading) {
      setValidationError("");
      setDialog(null);
    }
  }

  async function submitName() {
    if (!dialog || dialog.type === "delete" || !formName.trim()) return;
    const name = formName.trim();
    if (dialog.type === "create" && !createProjectSlug(name)) {
      setValidationError("Enter a project name that can be converted to a URL slug.");
      return;
    }

    setIsLoading(true);
    setValidationError("");
    try {
      if (dialog.type === "create") {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error(await readError(response));
        const project = (await response.json()) as ApiProject;
        setDialog(null);
        router.push(`/editor/${encodeURIComponent(project.id)}`);
        router.refresh();
      } else {
        const response = await fetch(`/api/projects/${encodeURIComponent(dialog.project.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error(await readError(response));
        setDialog(null);
        router.refresh();
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Unable to save project.");
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmDelete() {
    if (!dialog || dialog.type !== "delete") return;
    setIsLoading(true);
    setValidationError("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(dialog.project.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response));
      setDialog(null);
      if (dialog.project.id === activeProjectId) router.push("/editor");
      router.refresh();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Unable to delete project.");
    } finally {
      setIsLoading(false);
    }
  }

  return {
    projects: initialProjects,
    dialog,
    formName,
    setFormName: updateFormName,
    validationError,
    slugPreview,
    isLoading,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    submitName,
    confirmDelete,
  };
}
