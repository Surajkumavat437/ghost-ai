import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <Suspense fallback={<p>Loading sign in...</p>}>
      <SignIn />
    </Suspense>
  );
}
