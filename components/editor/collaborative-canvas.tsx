"use client";

import { ClientSideSuspense, LiveblocksProvider, RoomProvider, useErrorListener } from "@liveblocks/react";
import { useState } from "react";

import { CanvasFlow } from "@/components/editor/canvas-flow";

function CanvasRoomContent({ onError }: { onError: () => void }) {
  useErrorListener(onError);
  return (
    <ClientSideSuspense
      fallback={
        <div
          aria-live="polite"
          className="relative h-full w-full overflow-hidden bg-base"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--border-subtle) 2px, transparent 2px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div className="absolute bottom-4 right-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-surface-border bg-surface/95 px-2.5 py-1 text-[10px] font-medium text-copy-secondary shadow-lg shadow-base/40 backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-state-warning" />
            Connecting
          </div>
          <div className="flex h-full items-center justify-center text-xs text-copy-muted">
            Loading shared canvas…
          </div>
        </div>
      }
    >
      <CanvasFlow />
    </ClientSideSuspense>
  );
}

function CanvasRoom({ roomId }: { roomId: string }) {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-copy-muted">
        The shared canvas could not connect. Please refresh to try again.
      </div>
    );
  }

  return (
    <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
      <CanvasRoomContent onError={() => setHasError(true)} />
    </RoomProvider>
  );
}

export function CollaborativeCanvas({ roomId }: { roomId: string }) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <CanvasRoom roomId={roomId} />
    </LiveblocksProvider>
  );
}
