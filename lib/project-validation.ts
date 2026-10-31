export const MAX_PROJECT_NAME_LENGTH = 100;

export interface ProjectNameValidation {
  name: string | null;
  error: string | null;
}

export function validateProjectName(value: unknown): ProjectNameValidation {
  if (typeof value !== "string") {
    return { name: null, error: "Project name must be a string." };
  }

  const name = value.trim();
  if (!name) {
    return { name: null, error: "Project name cannot be empty." };
  }

  if (name.length > MAX_PROJECT_NAME_LENGTH) {
    return {
      name: null,
      error: `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer.`,
    };
  }

  return { name, error: null };
}
