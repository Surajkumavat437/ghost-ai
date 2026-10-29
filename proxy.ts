import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
const signUpPath = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up";
function isPublicRoute(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  return [signInPath, signUpPath].some((configuredPath) => {
    const routePath = new URL(configuredPath, request.url).pathname.replace(/\/$/, "");
    return pathname === routePath || pathname.startsWith(`${routePath}/`);
  });
}

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
