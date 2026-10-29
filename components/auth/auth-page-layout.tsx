import type { ReactNode } from "react";
import { Activity, FileText, Share2 } from "lucide-react";

interface AuthPageLayoutProps {
  children: ReactNode;
}

const features = [
  {
    icon: Activity,
    title: "AI Architecture Generation",
    description: "Describe your system, and AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
  },
];

export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <main className="grid min-h-dvh bg-bg-base md:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border-default bg-bg-surface px-10 py-8 md:flex xl:px-14 xl:py-12">
        <div className="flex items-center gap-3" aria-label="Ghost AI">
          <span aria-hidden="true" className="h-7 w-7 rounded-md bg-accent-primary" />
          <span className="text-sm font-semibold text-text-primary">Ghost AI</span>
        </div>

        <div className="max-w-xl py-8">
          <h1 className="max-w-md text-2xl font-semibold leading-tight tracking-tight text-text-primary">
            Design systems at the speed of thought.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
            Describe your architecture in plain English. Ghost AI maps it to a shared canvas your whole team can refine in real time.
          </p>
          <ul className="mt-10 space-y-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-primary-dim text-accent-primary">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-text-secondary">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-text-muted">{description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-text-faint">© 2026 Ghost AI. All rights reserved.</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center bg-bg-base px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
