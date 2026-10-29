import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";

export const instant = false;

export default function SignUpPage() {
  return (
    <AuthPageLayout>
      <Suspense
        fallback={<p className="text-center text-sm text-text-muted">Loading sign-up…</p>}
      >
        <SignUp />
      </Suspense>
    </AuthPageLayout>
  );
}
