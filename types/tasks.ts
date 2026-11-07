import { z } from "zod";

export const AI_STATUS_FEED_ID = "ai-status-feed";
export const AI_CHAT_FEED_ID = "ai-chat";

export const aiChatMessageSchema = z.object({
  sender: z.string().trim().min(1).max(100),
  role: z.enum(["user", "assistant", "error"]),
  content: z.string().trim().min(1).max(2_000),
  timestamp: z.string().datetime({ offset: true }),
});

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

export const AI_STATUS_STATES = ["processing", "retrying", "complete", "error"] as const;
export type AiStatusState = (typeof AI_STATUS_STATES)[number];

export interface AiStatusMessage {
  state: AiStatusState;
  text?: string;
}

export function isAiStatusMessage(value: unknown): value is AiStatusMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.state === "string" &&
    AI_STATUS_STATES.some((state) => state === candidate.state) &&
    (candidate.text === undefined || typeof candidate.text === "string")
  );
}
