import { z } from "zod";

const chatMessageSchema = z.object({
  sender: z.string().trim().min(1).max(100),
  role: z.enum(["user", "assistant", "error"]),
  content: z.string().trim().min(1).max(2_000),
  timestamp: z.string().datetime({ offset: true }),
});

const canvasNodeSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.string().optional(),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  data: z.record(z.string(), z.unknown()),
}).passthrough();

const canvasEdgeSchema = z.object({
  id: z.string().min(1).max(200),
  source: z.string().min(1).max(200),
  target: z.string().min(1).max(200),
  label: z.unknown().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const specGenerationInputSchema = z.object({
  projectId: z.string().trim().min(1).max(100),
  roomId: z.string().trim().min(1).max(100),
  chatHistory: z.array(chatMessageSchema).max(200),
  nodes: z.array(canvasNodeSchema).max(500),
  edges: z.array(canvasEdgeSchema).max(1_000),
});

export const specGenerationRequestSchema = specGenerationInputSchema.omit({ projectId: true });
export const specGenerationTokenSchema = z.object({ runId: z.string().trim().min(1).max(200) });

export type SpecGenerationInput = z.infer<typeof specGenerationInputSchema>;
