import { currentUser } from "@clerk/nextjs/server";

interface UserEmailAddress {
  emailAddress: string;
  verification: { status: string | null } | null;
}

interface ProjectAccessUser {
  id: string;
  emailAddresses: UserEmailAddress[];
}

type CurrentUserLoader = () => Promise<ProjectAccessUser | null>;

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
