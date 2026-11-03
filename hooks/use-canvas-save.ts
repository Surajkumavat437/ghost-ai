"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error";

const SAVE_TIMEOUT_MS = 30_000;
const SAVE_QUEUE_TIMEOUT_MS = 30_000;

interface PendingManualSave {
  traceId: string;
  resolve: (saved: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
}

function getCanvasSignature(snapshot: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  const nodes = snapshot.nodes.map(({ selected: _selected, dragging: _dragging, resizing: _resizing, measured: _measured, width: _width, height: _height, ...node }) => node);
  const edges = snapshot.edges.map(({ selected: _selected, ...edge }) => edge);
  return JSON.stringify({ nodes, edges });
}

export function useCanvasSave(projectId: string, nodes: CanvasNode[], edges: CanvasEdge[], enabled: boolean, canQueue: boolean) {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const latestSnapshot = useRef({ nodes, edges });
  const previousSnapshot = useRef({ nodes, edges });
  const baselineSignature = useRef<string | null>(null);
  const requestedVersion = useRef(0);
  const savedVersion = useRef(0);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const pendingManualSaves = useRef<PendingManualSave[]>([]);

  // Keep the click handler pointed at the latest graph without persisting edits.
  useLayoutEffect(() => {
    latestSnapshot.current = { nodes, edges };
    const changed = previousSnapshot.current.nodes !== nodes || previousSnapshot.current.edges !== edges;
    previousSnapshot.current = { nodes, edges };
    if (!changed) return;
    const dirty = baselineSignature.current === null || getCanvasSignature(latestSnapshot.current) !== baselineSignature.current;
    setIsDirty(dirty);
    if (inFlight.current || pendingManualSaves.current.length > 0) return;
    setStatus(dirty ? "idle" : "saved");
    if (dirty) setErrorMessage(null);
  }, [nodes, edges]);

  const markClean = useCallback(() => {
    baselineSignature.current = getCanvasSignature(latestSnapshot.current);
    setIsDirty(false);
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  const saveNow = useCallback((traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`): Promise<boolean> => {
    if (!enabled) {
      if (!canQueue) {
        console.warn("[canvas-save] handler stopped: canvas is not ready", { traceId });
        setErrorMessage("Canvas is not ready to save yet.");
        setStatus("error");
        return Promise.resolve(false);
      }

      console.info("[canvas-save] manual save queued until canvas load completes", { traceId });
      setErrorMessage(null);
      setStatus("saving");
      return new Promise((resolve) => {
        const pending: PendingManualSave = {
          traceId,
          resolve,
          timeout: setTimeout(() => {
            pendingManualSaves.current = pendingManualSaves.current.filter((item) => item !== pending);
            console.warn("[canvas-save] queued save expired before canvas became ready", { traceId });
            setErrorMessage("Canvas did not become ready in time. Check the shared canvas connection and retry.");
            setStatus("error");
            resolve(false);
          }, SAVE_QUEUE_TIMEOUT_MS),
        };
        pendingManualSaves.current.push(pending);
      });
    }

    // Every explicit save requests the latest snapshot, including clicks during a save.
    requestedVersion.current += 1;
    if (inFlight.current) return inFlight.current;

    const saveLoop = async () => {
      const saveStartedAt = performance.now();
      setStatus("saving");
      setErrorMessage(null);
      console.info("[canvas-save] snapshot generated", { traceId, nodes: latestSnapshot.current.nodes.length, edges: latestSnapshot.current.edges.length });
      try {
        while (savedVersion.current < requestedVersion.current) {
          const version = requestedVersion.current;
          const snapshot = latestSnapshot.current;
          const snapshotStartedAt = performance.now();
          const body = JSON.stringify(snapshot);
          console.info("[canvas-save] snapshot serialized", { traceId, durationMs: Math.round(performance.now() - snapshotStartedAt), nodes: snapshot.nodes.length, edges: snapshot.edges.length, characters: body.length });
          const requestStartedAt = performance.now();
          console.info("[canvas-save] API request dispatched", { traceId, method: "PUT", endpoint: "/api/projects/[projectId]/canvas", bytes: body.length });
          const controller = new AbortController();
          const timeout = setTimeout(() => {
            console.warn("[canvas-save] client timeout reached", { traceId });
            controller.abort();
          }, SAVE_TIMEOUT_MS);
          try {
            const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/canvas`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", "X-Canvas-Save-Trace": traceId },
              body,
              cache: "no-store",
              signal: controller.signal,
            });
            console.info("[canvas-save] API response received", { traceId, status: response.status, durationMs: Math.round(performance.now() - requestStartedAt) });
            if (!response.ok) {
              let message = `Canvas save failed (${response.status}).`;
              try {
                const result: unknown = await response.json();
                if (typeof result === "object" && result !== null && "error" in result && typeof result.error === "string") {
                  message = result.error;
                }
              } catch {
                // Keep the HTTP status message if the server did not return JSON.
              }
              console.error("[canvas-save] API returned error", { traceId, status: response.status, message });
              throw new Error(message);
            }
            const result: unknown = await response.json();
            if (typeof result !== "object" || result === null || !("saved" in result) || result.saved !== true) {
              console.error("[canvas-save] API response missing save confirmation", { traceId });
              throw new Error("Canvas save was not confirmed by the server");
            }
            console.info("[canvas-save] successful API response", { traceId, totalDurationMs: Math.round(performance.now() - saveStartedAt) });
            savedVersion.current = version;
            baselineSignature.current = getCanvasSignature(snapshot);
          } finally {
            clearTimeout(timeout);
          }
        }
        const dirty = getCanvasSignature(latestSnapshot.current) !== baselineSignature.current;
        setIsDirty(dirty);
        setStatus(dirty ? "idle" : "saved");
        return true;
      } catch (error) {
        console.error("[canvas-save] save failed", { traceId, name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Unknown error" });
        setErrorMessage(error instanceof Error ? error.message : "Canvas save failed. Check the server logs for details.");
        setStatus("error");
        return false;
      } finally {
        inFlight.current = null;
      }
    };

    const task = saveLoop();
    inFlight.current = task;
    return task;
  }, [canQueue, enabled, projectId]);

  useEffect(() => {
    const pending = pendingManualSaves.current;
    if (pending.length === 0) return;

    if (!canQueue) {
      pendingManualSaves.current = [];
      const message = "Canvas could not finish loading. Save was not sent to avoid replacing unknown saved work.";
      pending.forEach(({ resolve, timeout }) => {
        clearTimeout(timeout);
        resolve(false);
      });
      queueMicrotask(() => {
        setErrorMessage(message);
        setStatus("error");
      });
      return;
    }

    if (!enabled) return;
    pendingManualSaves.current = [];
    pending.forEach(({ timeout }) => clearTimeout(timeout));
    void saveNow(pending[0].traceId).then((saved) => {
      pending.forEach(({ resolve }) => resolve(saved));
    });
  }, [canQueue, enabled, saveNow]);

  useEffect(() => () => {
    const pending = pendingManualSaves.current;
    pendingManualSaves.current = [];
    pending.forEach(({ resolve, timeout }) => {
      clearTimeout(timeout);
      resolve(false);
    });
  }, []);

  return { status, saveNow, errorMessage, isDirty, markClean, markDirty };
}
