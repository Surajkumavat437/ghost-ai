import { Liveblocks } from "@liveblocks/node";

const CURSOR_COLORS = [
  "#00C8D4",
  "#8B82FF",
  "#FF990A",
  "#FF6166",
  "#F75F8F",
  "#62C073",
  "#52A8FF",
  "#0AC7B4",
] as const;

const globalForLiveblocks = globalThis as typeof globalThis & {
  liveblocks?: Liveblocks;
};

export function getLiveblocksClient() {
  if (globalForLiveblocks.liveblocks) return globalForLiveblocks.liveblocks;

  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not configured");
  }

  const client = new Liveblocks({ secret });
  globalForLiveblocks.liveblocks = client;
  return client;
}

export function getCursorColor(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) | 0;
  }
  return CURSOR_COLORS[(hash >>> 0) % CURSOR_COLORS.length];
}
