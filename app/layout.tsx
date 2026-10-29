import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { authAppearance } from "@/components/auth/auth-appearance";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghost AI",
  description: "Collaborative system design workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-base text-copy-primary">
        <ClerkProvider
          ui={ui}
          appearance={authAppearance}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
