import { auth } from "@clerk/nextjs/server";
import { getAccessibleProjects } from "@/lib/projects";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await getAccessibleProjects(userId);

  return Response.json(projects);
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const nameValue = (body as Record<string, unknown>).name;
  if (nameValue !== undefined && typeof nameValue !== "string") {
    return Response.json({ error: "Project name must be a string" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name: nameValue ?? "Untitled Project",
    },
  });

  return Response.json(project, { status: 201 });
}
