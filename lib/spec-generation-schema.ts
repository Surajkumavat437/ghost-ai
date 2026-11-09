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

// The configured Nemotron model has a 256K-token context window. Reserve room
// for the system instructions, reasoning, and up to 16,384 completion tokens.
// Without the provider tokenizer at request time, use a conservative estimate
// of one token per three serialized characters and cap input at 180K tokens.
const MAX_ESTIMATED_INPUT_TOKENS = 180_000;
const MAX_SERIALIZED_INPUT_CHARACTERS = MAX_ESTIMATED_INPUT_TOKENS * 3;

const specGenerationBaseSchema = z.object({
  projectId: z.string().trim().min(1).max(100),
  roomId: z.string().trim().min(1).max(100),
  chatHistory: z.array(chatMessageSchema).max(200),
  nodes: z.array(canvasNodeSchema).max(500),
  edges: z.array(canvasEdgeSchema).max(1_000),
});

function validateInputBudget(input: unknown, context: z.RefinementCtx) {
  const serializedLength = JSON.stringify(input).length;
  if (serializedLength > MAX_SERIALIZED_INPUT_CHARACTERS) {
    context.addIssue({
      code: "custom",
      message: `Canvas and chat data are too large for spec generation (about ${Math.ceil(serializedLength / 3).toLocaleString()} estimated tokens). Reduce oversized labels or remove some canvas content, then try again.`,
    });
  }
}

export const specGenerationInputSchema = specGenerationBaseSchema.superRefine(validateInputBudget);

export const specGenerationRequestSchema = specGenerationBaseSchema.omit({ projectId: true }).superRefine(validateInputBudget);
export const specGenerationTokenSchema = z.object({ runId: z.string().trim().min(1).max(200) });

export type SpecGenerationInput = z.infer<typeof specGenerationInputSchema>;
