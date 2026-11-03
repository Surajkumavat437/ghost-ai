"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, Download, FileText, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const starterPrompts = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

interface ChatMessage {
  id: number;
  content: string;
}

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [specNotice, setSpecNotice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextMessageId = useRef(0);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    nextMessageId.current += 1;
    setMessages((current) => [...current, { id: nextMessageId.current, content }]);
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "72px";
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <>
      <button
        aria-label="Close AI panel"
        aria-hidden={!isOpen}
        className={`fixed inset-x-0 bottom-0 top-14 z-50 bg-base/75 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />
      <aside
        aria-label="AI workspace"
        aria-hidden={!isOpen}
        className={`editor-ai-glow fixed bottom-3 left-3 right-3 top-[4.5rem] z-[60] flex flex-col overflow-hidden rounded-2xl border border-surface-border border-t-2 border-t-ai/50 bg-base/95 shadow-2xl shadow-base/60 backdrop-blur-xl transition-[transform,opacity,visibility] duration-300 ease-in-out motion-reduce:transition-none sm:left-auto sm:right-4 sm:w-[min(22rem,calc(100vw-2rem))] lg:bottom-4 lg:z-[60] ${isOpen ? "visible translate-x-0 opacity-100" : "invisible translate-x-[calc(100%+1.5rem)] opacity-0"}`}
        inert={!isOpen}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-ai/20 bg-ai/10 text-ai-text">
              <Bot aria-hidden="true" className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[13px] font-semibold text-copy-primary">AI Workspace</h2>
              <p className="mt-0.5 truncate text-[11px] text-copy-muted">Collaborate with Ghost AI</p>
            </div>
          </div>
          <Button aria-label="Close AI workspace" className="shrink-0 text-copy-muted" onClick={onClose} size="icon" title="Close AI workspace" variant="ghost">
            <X aria-hidden="true" className="size-4" />
          </Button>
        </header>

        <Tabs defaultValue="architect" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="mx-4 mt-3 grid h-9 w-auto shrink-0 grid-cols-2 rounded-xl border border-surface-border bg-elevated p-1">
            <TabsTrigger value="architect" className="rounded-lg text-xs text-copy-muted data-active:bg-accent-dim data-active:text-brand data-active:shadow-none">AI Architect</TabsTrigger>
            <TabsTrigger value="specs" className="rounded-lg text-xs text-copy-muted data-active:bg-accent-dim data-active:text-brand data-active:shadow-none">Specs</TabsTrigger>
          </TabsList>

          <TabsContent value="architect" className="flex min-h-0 flex-1 flex-col">
            <div aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center py-5 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-ai/20 bg-ai/10 text-ai-text">
                    <Bot aria-hidden="true" className="size-6" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-copy-primary">What are we building?</h3>
                  <p className="mt-1.5 max-w-64 text-xs leading-5 text-copy-muted">Describe a system or choose a starting point. Ghost AI will help shape the architecture.</p>
                  <div className="mt-5 flex w-full flex-col gap-2">
                    {starterPrompts.map((prompt) => (
                      <button key={prompt} className="w-full rounded-xl border border-surface-border bg-subtle px-3 py-2.5 text-left text-xs leading-4 text-ai-text transition-colors hover:border-brand/40 hover:bg-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => { setDraft(prompt); textareaRef.current?.focus(); }} type="button">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message) => (
                    <div key={message.id} className="flex justify-end">
                      <p className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border-2 border-brand/50 bg-accent-dim px-3 py-2.5 text-xs leading-5 text-copy-primary">{message.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form className="shrink-0 border-t border-surface-border bg-surface/80 p-3" onSubmit={submitMessage}>
              <div className="rounded-xl border border-surface-border bg-base transition-colors focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/15">
                <Textarea
                  aria-label="Message Ghost AI"
                  className="min-h-[72px] max-h-40 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-xs leading-5 shadow-none placeholder:text-copy-faint focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    event.target.style.height = "72px";
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
                  }}
                  onKeyDown={handleComposerKeyDown}
                  ref={textareaRef}
                  placeholder="Describe your system..."
                  value={draft}
                />
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="pl-1 text-[10px] text-copy-faint">Enter to send · Shift+Enter for a new line</span>
                  <Button aria-label="Send message" className="size-8 rounded-lg bg-brand text-copy-on-brand hover:bg-brand/85" disabled={!draft.trim()} size="icon" title="Send message" type="submit">
                    <Send aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-copy-faint">AI responses will be connected in a later step.</p>
            </form>
          </TabsContent>

          <TabsContent value="specs" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <Button className="w-full bg-brand text-copy-on-brand hover:bg-brand/85" onClick={() => setSpecNotice(true)} type="button">
              <FileText aria-hidden="true" className="size-4" />
              Generate Spec
            </Button>
            {specNotice && <p aria-live="polite" className="mt-2 text-center text-xs text-copy-muted">Spec generation will be available soon.</p>}
            <article className="mt-4 rounded-2xl border border-surface-border bg-elevated p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-accent-dim text-brand">
                  <FileText aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-copy-primary">System Architecture</h3>
                  <p className="mt-1 text-[11px] text-copy-muted">Markdown · Preview</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-4 text-xs leading-5 text-copy-secondary">This specification outlines the system components, their responsibilities, and the connections that bring the architecture together.</p>
              <div className="mt-4 border-t border-surface-border pt-3">
                <Button aria-label="Download spec (unavailable)" className="w-full" disabled variant="secondary">
                  <Download aria-hidden="true" className="size-3.5" />
                  Download
                </Button>
              </div>
            </article>
          </TabsContent>
        </Tabs>
      </aside>
    </>
  );
}
