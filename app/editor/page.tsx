import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { EditorLayout } from "@/components/editor/editor-layout";
import { getAccessibleProjects } from "@/lib/projects";

export const instant = false;

export default async function EditorPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const projects = await getAccessibleProjects(userId);

  return (
    <EditorLayout projects={projects} />
  );
}
