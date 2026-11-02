import { currentUser } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

interface UserEmailAddress {
  id?: string;
  emailAddress: string;
  verification: { status: string | null } | null;
}

interface ProjectAccessUser {
  id: string;
  emailAddresses: UserEmailAddress[];
  primaryEmailAddressId?: string | null;
}

type CurrentUserLoader = () => Promise<ProjectAccessUser | null>;

export async function getCurrentClerkIdentity() {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const user = await currentUser();
    const primaryEmail = user?.id === userId
      ? user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ?? null
      : null;
    return { userId, primaryEmail: primaryEmail?.trim().toLowerCase() || null };
  } catch {
    return { userId, primaryEmail: null };
  }
}

export async function canAccessProject(userId: string, primaryEmail: string | null, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        ...(primaryEmail ? [{ collaborators: { some: { email: { equals: primaryEmail, mode: "insensitive" as const } } } }] : []),
      ],
    },
    select: { id: true, name: true, ownerId: true },
  });
  return project ? { id: project.id, name: project.name, owned: project.ownerId === userId } : null;
}

export async function getVerifiedCollaboratorEmails(
  userId: string,
  loadUser: CurrentUserLoader = currentUser,
): Promise<string[]> {
  try {
    const user = await loadUser();
    if (!user || user.id !== userId) return [];

    return user.emailAddresses
      .filter((address) => address.verification?.status === "verified")
      .map((address) => address.emailAddress.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    // Owner access must continue even if Clerk's profile lookup is unavailable.
    return [];
  }
}
