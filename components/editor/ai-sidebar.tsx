"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { useCreateFeedMessage, useFeedMessages, useSelf, useStorage } from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import type { AnyTask, RealtimeRun } from "@trigger.dev/core/v3";
import { Bot, Download, FileText, LoaderCircle, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SpecMarkdown } from "@/components/editor/spec-markdown";
import { AI_CHAT_FEED_ID, AI_STATUS_FEED_ID, aiChatMessageSchema, isAiStatusMessage } from "@/types/tasks";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  specs: { id: string; createdAt: string; filename: string }[];
}

export function AiSidebar({ isOpen, onClose, projectId, specs }: AiSidebarProps) {
  const hasMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [draft, setDraft] = useState("");
  const [selectedSpec, setSelectedSpec] = useState<AiSidebarProps["specs"][number] | null>(null);
  const [specContent, setSpecContent] = useState<string | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const specRequestRef = useRef<AbortController | null>(null);
  const [specRun, setSpecRun] = useState<{ runId: string; publicToken: string } | null>(null);
  const [isStartingSpec, setIsStartingSpec] = useState(false);
  const [specRunError, setSpecRunError] = useState<string | null>(null);
  const [specRunStatus, setSpecRunStatus] = useState<string | null>(null);
  const finishedSpecRunRef = useRef<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeRun, setActiveRun] = useState<{ runId: string; publicToken: string } | null>(null);
  const completedRunRef = useRef<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const createFeedMessage = useCreateFeedMessage();
  const self = useSelf();
  const canvas = useStorage((root) => root.flow);
  const finishSpecRun = useCallback((completedRun: RealtimeRun<AnyTask>, error?: Error) => {
    const runId = specRun?.runId;
    if (!runId) return;
    if (runId && finishedSpecRunRef.current === runId) return;
    finishedSpecRunRef.current = runId;
    const succeeded = completedRun.isSuccess || completedRun.metadata?.status === "complete";
    if (error) {
      setSpecRunError(`Could not track spec generation: ${error.message}`);
      setSpecRunStatus(null);
    } else if (succeeded) {
      setSpecRunError(null);
      setSpecRunStatus("Spec generated successfully.");
    } else {
      const metadataError = completedRun.metadata?.error;
      setSpecRunError(typeof metadataError === "string" ? metadataError : completedRun.error?.message ?? "Spec generation failed. Check the Trigger.dev run for details.");
      setSpecRunStatus(null);
    }
    setSpecRun(null);
    router.refresh();
  }, [router, specRun?.runId]);
  const { run, error: runError } = useRealtimeRun(activeRun?.runId, {
    id: activeRun?.runId,
    accessToken: activeRun?.publicToken,
    enabled: Boolean(activeRun?.runId && activeRun.publicToken),
    skipColumns: ["payload", "output"],
  });
  const { messages: feedMessages } = useFeedMessages(AI_STATUS_FEED_ID, { limit: 1 });
  const { messages: chatFeedMessages, error: chatFeedError, fetchMore, hasFetchedAll, isFetchingMore, fetchMoreError } = useFeedMessages(AI_CHAT_FEED_ID, { limit: 100 });
  const { run: specRunData, error: specRealtimeError } = useRealtimeRun(specRun?.runId, {
    id: specRun?.runId,
    accessToken: specRun?.publicToken,
    enabled: Boolean(specRun?.runId && specRun.publicToken),
    skipColumns: ["payload", "output"],
    onComplete: finishSpecRun,
  });
  const latestStatus = [...(feedMessages ?? [])].reverse().find((message) => isAiStatusMessage(message.data));
  const activeStatus = latestStatus && isAiStatusMessage(latestStatus.data) ? latestStatus.data : null;
  const chatMessages = (chatFeedMessages ?? [])
    .map((message) => ({ message, data: aiChatMessageSchema.safeParse(message.data) }))
    .filter((entry) => entry.data.success)
    .sort((a, b) => a.message.createdAt - b.message.createdAt);

  async function openSpecPreview(spec: AiSidebarProps["specs"][number]) {
    specRequestRef.current?.abort();
    const controller = new AbortController();
    specRequestRef.current = controller;
    setSelectedSpec(spec);
    setSpecContent(null);
    setSpecError(null);
    setSpecLoading(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(spec.id)}/download`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message = typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).error === "string"
          ? (body as { error: string }).error
          : "Could not load this spec.";
        throw new Error(message);
      }
      setSpecContent(await response.text());
    } catch (error) {
      if (!controller.signal.aborted) setSpecError(error instanceof Error ? error.message : "Could not load this spec.");
    } finally {
      if (!controller.signal.aborted) setSpecLoading(false);
    }
  }

  function closeSpecPreview() {
    specRequestRef.current?.abort();
    specRequestRef.current = null;
    setSelectedSpec(null);
    setSpecContent(null);
    setSpecError(null);
    setSpecLoading(false);
  }

  async function generateSpec() {
    if (specRun || isStartingSpec || isSending) return;
    setIsStartingSpec(true);
    setSpecRunError(null);
    setSpecRunStatus("Queueing spec generation…");
    try {
      const nodes = canvas?.nodes ? Object.values(canvas.nodes) : [];
      const edges = canvas?.edges ? Object.values(canvas.edges) : [];
      const chatHistory = chatMessages.flatMap((entry) => entry.data.success ? [entry.data.data] : []);
      const response = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: projectId, chatHistory, nodes, edges }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof result !== "object" || result === null || typeof (result as Record<string, unknown>).runId !== "string") {
        const message = typeof result === "object" && result !== null && typeof (result as Record<string, unknown>).error === "string"
          ? (result as { error: string }).error
          : "Could not start spec generation.";
        throw new Error(message);
      }
      const runId = (result as { runId: string }).runId;
      const tokenResponse = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const tokenResult: unknown = await tokenResponse.json().catch(() => null);
      if (!tokenResponse.ok || typeof tokenResult !== "object" || tokenResult === null || typeof (tokenResult as Record<string, unknown>).token !== "string") {
        const message = typeof tokenResult === "object" && tokenResult !== null && typeof (tokenResult as Record<string, unknown>).error === "string"
          ? (tokenResult as { error: string }).error
          : "Spec generation was queued, but live progress could not be connected.";
        throw new Error(message);
      }
      setSpecRun({ runId, publicToken: (tokenResult as { token: string }).token });
      finishedSpecRunRef.current = null;
      setSpecRunStatus("Spec generation is running…");
    } catch (error) {
      setSpecRunStatus(null);
      setSpecRunError(error instanceof Error ? error.message : "Could not start spec generation.");
    } finally {
      setIsStartingSpec(false);
    }
  }

  const latestActiveStatus = activeStatus && (activeStatus.state === "processing" || (activeStatus.state as string) === "retrying") ? activeStatus : null;
  const isRunActive = Boolean(activeRun || latestActiveStatus);
  const specMetadataStatus = typeof specRunData?.metadata?.status === "string" ? specRunData.metadata.status : null;
  const specProgress = typeof specRunData?.metadata?.progress === "number" ? Math.round(specRunData.metadata.progress * 100) : null;
  const specRunLabel = specMetadataStatus === "retrying" ? "Provider is busy; retrying spec generation…"
    : specMetadataStatus === "saving" ? "Saving the generated spec…"
    : specMetadataStatus === "processing" ? "Generating the technical spec…"
    : specRunStatus ?? "Spec generation is running…";

  // The task persists the Blob and database record before publishing this metadata.
  // Treat it as authoritative completion so a delayed/missed terminal realtime event
  // cannot leave the button spinning after the spec is already saved.
  useEffect(() => {
    if (!specRun || specMetadataStatus !== "complete" || !specRunData) return;
    finishSpecRun(specRunData);
  }, [finishSpecRun, specMetadataStatus, specRun, specRunData]);

  useEffect(() => {
    if (!activeRun || !run?.finishedAt || completedRunRef.current === activeRun.runId) return;
    completedRunRef.current = activeRun.runId;
    const succeeded = run.isSuccess;
    const message = aiChatMessageSchema.safeParse({
      sender: "Ghost AI",
      role: succeeded ? "assistant" : "error",
      content: (succeeded
        ? latestActiveStatus?.text || "Design generation complete. Canvas updates are shared with the room."
        : latestActiveStatus?.text || run.error?.message || "Design generation failed. Please try again.").slice(0, 2_000),
      timestamp: new Date().toISOString(),
    });
    setActiveRun(null);
    if (message.success) void createFeedMessage(AI_CHAT_FEED_ID, message.data).catch((error: unknown) => {
      setChatError(error instanceof Error ? error.message : "Could not publish the AI result to room chat.");
    });
  }, [activeRun, run, latestActiveStatus?.text, createFeedMessage]);

  useEffect(() => {
    if (!activeRun || !runError || completedRunRef.current === activeRun.runId) return;
    completedRunRef.current = activeRun.runId;
    setActiveRun(null);
    const message = aiChatMessageSchema.safeParse({ sender: "Ghost AI", role: "error", content: "Lost the live connection to this design run. Check the canvas for updates, then try again if needed.", timestamp: new Date().toISOString() });
    if (message.success) void createFeedMessage(AI_CHAT_FEED_ID, message.data).catch(() => setChatError("Could not publish the run error to room chat."));
  }, [activeRun, runError, createFeedMessage]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = aiChatMessageSchema.safeParse({
      sender: self?.info.name?.trim().slice(0, 100) || "Collaborator",
      role: "user",
      content: draft,
      timestamp: new Date().toISOString(),
    });
    if (!parsed.success || isSending || activeRun) return;

    setChatError(null);
    setIsSending(true);
    try {
      await createFeedMessage(AI_CHAT_FEED_ID, parsed.data);
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "72px";
      const response = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: parsed.data.content, roomId: projectId }),
      });
      const result: unknown = await response.json().catch(() => null);
      const resultBody = typeof result === "object" && result !== null ? result as Record<string, unknown> : null;
      const runId = typeof resultBody?.runId === "string" ? resultBody.runId : null;
      let publicToken = typeof resultBody?.publicToken === "string" ? resultBody.publicToken : null;

      // Recover if the run was queued but the combined endpoint could not mint
      // its realtime token. The token route verifies this user's saved run.
      if (runId && !publicToken) {
        const tokenResponse = await fetch("/api/ai/design/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId }),
        });
        const tokenResult: unknown = await tokenResponse.json().catch(() => null);
        if (tokenResponse.ok && typeof tokenResult === "object" && tokenResult !== null && typeof (tokenResult as Record<string, unknown>).token === "string") {
          publicToken = (tokenResult as { token: string }).token;
        }
      }

      if (!runId || !publicToken) {
        const detail = typeof result === "object" && result !== null && typeof (result as Record<string, unknown>).error === "string"
          ? (result as Record<string, string>).error
          : response.ok
            ? "Design started, but live status could not be connected. Try again in a moment."
            : "Could not start design generation.";
        throw new Error(detail);
      }
      completedRunRef.current = null;
      setActiveRun({ runId, publicToken });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Could not start design generation.";
      setChatError(detail);
      const errorMessage = aiChatMessageSchema.safeParse({ sender: "Ghost AI", role: "error", content: detail, timestamp: new Date().toISOString() });
      if (errorMessage.success) await createFeedMessage(AI_CHAT_FEED_ID, errorMessage.data).catch(() => undefined);
    } finally {
      setIsSending(false);
    }
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
              {hasMounted && !hasFetchedAll && chatMessages.length > 0 && (
                <div className="mb-3 text-center">
                  <Button className="h-7 text-[10px] text-copy-muted" disabled={isFetchingMore} onClick={fetchMore} type="button" variant="ghost">
                    {isFetchingMore ? "Loading earlier messages…" : "Load earlier messages"}
                  </Button>
                  {fetchMoreError && <p role="alert" className="text-[10px] text-state-error">Could not load earlier messages.</p>}
                </div>
              )}
              {!hasMounted || chatMessages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center py-5 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-ai/20 bg-ai/10 text-ai-text">
                    <Bot aria-hidden="true" className="size-6" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-copy-primary">Design with Ghost AI</h3>
                  <p className="mt-1.5 max-w-64 text-xs leading-5 text-copy-muted">Describe an architecture or a change. Your prompt and the result are shared with everyone in this room.</p>
                </div>
              ) : (
                <ol aria-label="Room chat messages" className="flex flex-col gap-3">
                  {chatMessages.map(({ message, data }) => {
                    if (!data.success) return null;
                    const chat = data.data;
                    return <li key={message.id} className={`max-w-[92%] rounded-xl border px-3 py-2.5 ${chat.role === "user" ? "ml-auto border-brand/20 bg-accent-dim" : chat.role === "error" ? "border-state-error/30 bg-state-error/10" : "border-surface-border bg-elevated/70"}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[11px] font-semibold ${chat.role === "user" ? "text-brand" : chat.role === "error" ? "text-state-error" : "text-ai-text"}`}>{chat.sender}</span>
                        <time className="shrink-0 text-[10px] text-copy-faint" dateTime={chat.timestamp}>{hasMounted ? new Date(chat.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-copy-secondary">{chat.content}</p>
                    </li>;
                  })}
                </ol>
              )}
            </div>

            <form className="shrink-0 border-t border-surface-border bg-surface/80 p-3" onSubmit={(event) => void submitMessage(event)}>
              {isRunActive && (
                <div aria-live="polite" className="mb-3 flex items-center gap-2 rounded-xl border border-brand/25 bg-accent-dim px-3 py-2 text-[11px] leading-4 text-brand">
                  <LoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin" />
                  <span className="min-w-0">{latestActiveStatus?.text ?? "Ghost AI is starting your design…"}</span>
                </div>
              )}
              <div className="rounded-xl border border-surface-border bg-base transition-colors focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/15">
                <Textarea
                  aria-label="Message room"
                  maxLength={2_000}
                  className="min-h-[72px] max-h-40 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-xs leading-5 shadow-none placeholder:text-copy-faint focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    event.target.style.height = "72px";
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
                  }}
                  disabled={isSending || isRunActive}
                  onKeyDown={handleComposerKeyDown}
                  ref={textareaRef}
                  placeholder="Describe the system you want to design..."
                  value={draft}
                />
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="pl-1 text-[10px] text-copy-faint">Enter to send · Shift+Enter for a new line</span>
                  <Button aria-label={isRunActive ? "Design generation in progress" : isSending ? "Sending message" : "Send design prompt"} className="size-8 rounded-lg bg-brand text-copy-on-brand hover:bg-brand/85" disabled={!draft.trim() || isSending || isRunActive} size="icon" title={isRunActive ? "Design generation in progress" : "Send design prompt"} type="submit">
                    {isSending || isRunActive ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Send aria-hidden="true" className="size-3.5" />}
                  </Button>
                </div>
              </div>
              {chatError || chatFeedError ? <p role="alert" className="mt-2 break-words text-center text-[10px] text-state-error">{chatError ?? (chatFeedError instanceof Error ? `Could not load room chat: ${chatFeedError.message.slice(0, 240)}` : "Could not load room chat. Check your room connection and feed permissions.")}</p> : <p aria-live="polite" className="mt-2 text-center text-[10px] text-copy-faint">Room chat is shared with project collaborators.</p>}
            </form>
          </TabsContent>

          <TabsContent value="specs" className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
            <Button className="w-full bg-brand text-copy-on-brand hover:bg-brand/85" disabled={Boolean(specRun) || isStartingSpec || isSending || !canvas} onClick={() => void generateSpec()} type="button">
              {specRun || isStartingSpec ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <FileText aria-hidden="true" className="size-4" />}
              {specRun || isStartingSpec ? "Generating Spec…" : "Generate Spec"}
            </Button>
            {specRun && <p aria-live="polite" className="mt-2 text-center text-xs text-copy-muted">{specRealtimeError ? "Reconnecting to generation status…" : `${specRunLabel}${specProgress !== null ? ` (${specProgress}%)` : ""}`}</p>}
            {!specRun && specRunStatus && <p aria-live="polite" className="mt-2 text-center text-xs text-copy-muted">{specRunStatus}</p>}
            {specRunError && <p role="alert" className="mt-2 break-words text-center text-xs text-state-error">{specRunError}</p>}
            <ScrollArea className="mt-3 min-h-0 flex-1">
              {specs.length === 0 ? <p className="py-8 text-center text-xs text-copy-muted">No generated specs yet.</p> : <ul aria-label="Project specs" className="space-y-2 pr-2">
                {specs.map((spec) => <li key={spec.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-surface-border bg-elevated px-3 py-2">
                    <button className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left hover:text-copy-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => void openSpecPreview(spec)} type="button">
                    <FileText aria-hidden="true" className="size-4 shrink-0 text-brand" />
                    <span className="min-w-0"><span className="block truncate text-xs font-medium text-copy-primary">{spec.filename}</span><time className="mt-0.5 block text-[10px] text-copy-muted" dateTime={spec.createdAt}>{hasMounted ? new Date(spec.createdAt).toLocaleDateString() : ""}</time></span>
                  </button>
                  <a aria-label={`Download ${spec.filename}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-copy-muted hover:bg-subtle hover:text-copy-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" download href={`/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(spec.id)}/download`} title="Download spec">
                    <Download aria-hidden="true" className="size-3.5" />
                  </a>
                </li>)}
              </ul>}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </aside>
      <Dialog open={Boolean(selectedSpec)} onOpenChange={(open) => { if (!open) closeSpecPreview(); }}>
        <DialogContent className="!flex h-[80dvh] max-h-[85dvh] min-h-0 w-[calc(100vw-1rem)] max-w-4xl flex-col gap-4 overflow-hidden p-4 sm:w-[calc(100vw-2rem)] sm:p-6" showCloseButton={false}>
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle className="truncate" style={{ color: "white" }}>{selectedSpec?.filename ?? "Spec preview"}</DialogTitle>
            <DialogDescription style={{ color: "white" }}>{selectedSpec && hasMounted ? new Date(selectedSpec.createdAt).toLocaleString() : "Markdown specification preview"}</DialogDescription>
          </DialogHeader>
          <ScrollArea aria-label="Spec preview content" className="h-0 min-h-0 w-full flex-1 rounded-xl border border-surface-border bg-surface p-5 sm:p-7">
            {specLoading && <p className="text-xs text-copy-muted">Loading spec…</p>}
            {specError && <p role="alert" className="text-xs text-state-error">{specError}</p>}
            {specContent !== null && <SpecMarkdown content={specContent} />}
          </ScrollArea>
          <DialogFooter className="-mx-5 -mb-5 shrink-0 sm:-mx-6 sm:-mb-6">
            {selectedSpec && <a className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-copy-on-brand hover:bg-brand/85" download href={`/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(selectedSpec.id)}/download`}><Download aria-hidden="true" className="size-4" />Download</a>}
            <Button onClick={closeSpecPreview} type="button" variant="secondary">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
