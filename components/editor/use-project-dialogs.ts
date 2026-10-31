export interface EditorProject {
  id: string
  name: string
  owned: boolean
}

export type ProjectDialogState =
  | { type: "create" }
  | { type: "rename"; project: EditorProject }
  | { type: "delete"; project: EditorProject }
  | null

export function createProjectSlug(name: string) {
  const trimmedName = name.trim()
  const slug = trimmedName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (slug || !trimmedName) return slug

  const codePoints = Array.from(trimmedName, (character) =>
    character.codePointAt(0)?.toString(16)
  ).filter((codePoint): codePoint is string => codePoint !== undefined)

  return codePoints.length ? `project-${codePoints.join("-")}` : ""
}
