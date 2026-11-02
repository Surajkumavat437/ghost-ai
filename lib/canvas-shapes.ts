import { NODE_SHAPES, type NodeShape } from "@/types/canvas";

export const SHAPE_SIZES: Record<NodeShape, { width: number; height: number }> = {
  rectangle: { width: 180, height: 100 },
  diamond: { width: 150, height: 150 },
  circle: { width: 120, height: 120 },
  pill: { width: 160, height: 72 },
  cylinder: { width: 140, height: 110 },
  hexagon: { width: 160, height: 100 },
};

const MAX_DROP_DIMENSION = 1_000;

export interface CanvasShapeDropPayload {
  shape: NodeShape;
  size: { width: number; height: number };
}

export function parseCanvasShapeDropPayload(rawPayload: string): CanvasShapeDropPayload | null {
  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;

  const value = payload as Record<string, unknown>;
  if (!NODE_SHAPES.includes(value.shape as NodeShape)) return null;
  if (typeof value.size !== "object" || value.size === null || Array.isArray(value.size)) return null;

  const size = value.size as Record<string, unknown>;
  if (
    typeof size.width !== "number" || !Number.isFinite(size.width) || size.width <= 0 || size.width > MAX_DROP_DIMENSION ||
    typeof size.height !== "number" || !Number.isFinite(size.height) || size.height <= 0 || size.height > MAX_DROP_DIMENSION
  ) return null;

  return { shape: value.shape as NodeShape, size: { width: size.width, height: size.height } };
}

export function createCanvasNodeId(
  shape: NodeShape,
  cryptoProvider: Crypto | undefined = globalThis.crypto,
  secureContext = globalThis.isSecureContext === true,
): string {
  if (!cryptoProvider?.getRandomValues) {
    throw new Error("This browser does not provide a cryptographically secure random source.");
  }

  if (secureContext && typeof cryptoProvider.randomUUID === "function") {
    return `${shape}-${cryptoProvider.randomUUID()}`;
  }

  const randomBytes = cryptoProvider.getRandomValues(new Uint8Array(16));
  const randomId = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${shape}-${randomId}`;
}
