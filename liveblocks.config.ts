import type { LiveblocksFlow } from "@liveblocks/react-flow";

import type { CanvasEdge, CanvasNode } from "./types/canvas";

// Define Liveblocks types for the application.
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking: boolean;
    };
    Storage: {
      flow?: LiveblocksFlow<CanvasNode, CanvasEdge>;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar?: string;
        cursorColor: string;
      };
    };
    FeedMessageData: {
      state: "processing" | "retrying" | "complete" | "error";
      text?: string;
    } | {
      sender: string;
      role: "user" | "assistant" | "error";
      content: string;
      timestamp: string;
    };
    ThreadMetadata: Record<string, never>;
    RoomInfo: Record<string, never>;
  }
}

export {};
