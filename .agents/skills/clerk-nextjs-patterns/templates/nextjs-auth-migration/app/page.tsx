"use client";

import { useUser } from "@clerk/nextjs";

export default function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return <p>Loading...</p>;

  return isSignedIn ? (
    <main>
      <h1>Welcome, {user?.firstName ?? "there"}</h1>
    </main>
  ) : (
    <main>
      <h1>Welcome to the app</h1>
      <p>Please sign in to continue.</p>
    </main>
  );
}
