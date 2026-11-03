import { clerkClient } from "@clerk/nextjs/server";
import type { ProjectCollaborator } from "@/lib/generated/prisma/client";

export interface CollaboratorProfile {
  id: string;
  email: string;
  createdAt: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function enrichCollaborators(
  collaborators: ProjectCollaborator[],
): Promise<CollaboratorProfile[]> {
  const emails = [...new Set(collaborators.map(({ email }) => email.trim().toLowerCase()))];
  const emailSet = new Set(emails);
  const usersByEmail = new Map<string, { displayName: string | null; avatarUrl: string | null }>();

  try {
    const client = await clerkClient();
    for (let index = 0; index < emails.length; index += 100) {
      const batch = emails.slice(index, index + 100);
      const { data: users } = await client.users.getUserList({ emailAddress: batch, limit: batch.length });

      for (const user of users) {
        const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
          || user.username
           || null;
        for (const address of user.emailAddresses) {
          if (address.verification?.status !== "verified") continue;
          const email = address.emailAddress.trim().toLowerCase();
          if (emailSet.has(email) && !usersByEmail.has(email)) {
            usersByEmail.set(email, { displayName, avatarUrl: user.imageUrl || null });
          }
        }
      }
    }
  } catch {
    // Keep the share dialog useful if Clerk's profile API is temporarily unavailable.
  }

  return collaborators.map((collaborator) => {
    const email = collaborator.email.trim().toLowerCase();
    const profile = usersByEmail.get(email);
    return {
      id: collaborator.id,
      email: collaborator.email,
      createdAt: collaborator.createdAt.toISOString(),
      displayName: profile?.displayName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
    };
  });
}
