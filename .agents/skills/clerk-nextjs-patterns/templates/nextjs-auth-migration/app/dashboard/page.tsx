"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) return <p>Loading...</p>;
  if (!isSignedIn) return null;

  return (
    <main>
      <h1>Welcome, {user?.firstName ?? "there"}</h1>
      <p>Your user ID is {userId}.</p>
    </main>
  );
}
