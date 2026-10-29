import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";

export const instant = false;

export default function SignInPage() {
  return (
    <AuthPageLayout>
      <Suspense
        fallback={<p className="text-center text-sm text-text-muted">Loading sign-in…</p>}
      >
        <SignIn />
      </Suspense>
    </AuthPageLayout>
  );
}
