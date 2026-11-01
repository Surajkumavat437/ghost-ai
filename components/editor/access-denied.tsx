import Link from "next/link";
import { ArrowLeft, LockKeyhole, Workflow } from "lucide-react";

export function AccessDenied() {
  return (
    <main className="editor-home-glow relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-base px-5 py-12 text-center sm:px-8">
      <div className="relative flex max-w-md flex-col items-center">
        <Link aria-label="Ghost AI home" className="absolute -top-28 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm font-semibold text-copy-secondary sm:-top-32" href="/editor">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/20 bg-accent-dim text-brand"><Workflow className="h-4 w-4" /></span>
          Ghost AI
        </Link>
        <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-state-warning/20 bg-state-warning/10 text-state-warning shadow-lg shadow-state-warning/5">
          <LockKeyhole className="h-7 w-7" />
          <span aria-hidden="true" className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-base bg-state-warning" />
        </div>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-copy-faint">Workspace access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-copy-primary sm:text-3xl">This project is out of reach.</h1>
        <p className="mt-3 text-sm leading-6 text-copy-muted">You may not have access to this workspace, or it may have moved.</p>
        <Link className="mt-7 inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-elevated px-4 text-sm font-medium text-copy-primary transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="/editor">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </div>
    </main>
  );
}
