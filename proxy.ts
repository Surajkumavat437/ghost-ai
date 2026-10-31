import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const signInPath = getConfiguredAuthPath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  "/sign-in",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
);
const signUpPath = getConfiguredAuthPath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  "/sign-up",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
);

function getConfiguredAuthPath(
  configuredUrl: string | undefined,
  expectedPath: string,
  envName: string,
) {
  let pathname: string;

  try {
    pathname = new URL(configuredUrl ?? expectedPath, "http://localhost").pathname;
  } catch {
    throw new Error(`${envName} must resolve to ${expectedPath}.`);
  }

  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath !== expectedPath) {
    throw new Error(`${envName} must resolve to the implemented route ${expectedPath}.`);
  }

  return expectedPath;
}

function isPublicRoute(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  return [signInPath, signUpPath].some((routePath) => {
    return pathname === routePath || pathname.startsWith(`${routePath}/`);
  });
}

function isProjectApiRoute(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  return pathname === "/api/projects" || pathname.startsWith("/api/projects/");
}

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request) && !isProjectApiRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
