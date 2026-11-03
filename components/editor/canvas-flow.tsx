"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { useOthers, useUpdateMyPresence } from "@liveblocks/react";
import { useUser } from "@clerk/nextjs";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  NodeToolbar,
  NodeResizer,
  Position,
  ReactFlowProvider,
  Panel,
  ReactFlow,
  useReactFlow,
  useViewport,
  useNodes,
  useEdges,
  type NodeProps,
  type EdgeTypes,
} from "@xyflow/react";
import { useCanRedo, useCanUndo, useMutation, useRedo, useStatus, useUndo } from "@liveblocks/react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

import { createCanvasNodeId, parseCanvasShapeDropPayload, SHAPE_SIZES } from "@/lib/canvas-shapes";
import { CANVAS_CONNECTION_MODE, CANVAS_NODE_HANDLES } from "@/lib/canvas-connections";
import { NODE_COLORS, NODE_SHAPES, type CanvasEdge, type CanvasNode, type NodeShape } from "@/types/canvas";
import { CanvasEdgeRenderer, UpdateCanvasEdgeLabelContext } from "@/components/editor/canvas-edge";
import { CanvasControlBar } from "@/components/editor/canvas-control-bar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useStarterTemplates, type QueuedCanvasTemplate } from "@/components/editor/starter-templates-context";
import { useCanvasSave } from "@/hooks/use-canvas-save";
import { useWorkspaceSave } from "@/components/editor/workspace-save-context";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function CanvasPresence({ currentUserId, flowToScreenPosition, canvasBounds }: {
  currentUserId: string | undefined;
  flowToScreenPosition: (position: { x: number; y: number }) => { x: number; y: number };
  canvasBounds: DOMRect | null;
}) {
  const others = useOthers((users) => currentUserId ? users.filter((other) => other.id !== currentUserId) : []);
  const collaborators = others.slice(0, 5);
  const cursors = others.filter((other) => other.presence.cursor !== null);

  return <>
    <div className="pointer-events-none absolute right-4 top-4 z-30 flex items-center gap-2 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-lg shadow-base/40 backdrop-blur" aria-label={`${others.length} other ${others.length === 1 ? "collaborator" : "collaborators"} in this canvas`}>
      {collaborators.length > 0 && <div className="flex items-center pl-0.5" aria-label="Collaborators">
        {collaborators.map((other, index) => {
          const name = other.info.name || "Collaborator";
          const avatar = typeof other.info.avatar === "string" ? other.info.avatar.trim() : "";
          return <div key={other.connectionId} title={name} aria-label={name} className={`relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface text-[10px] font-semibold text-copy-primary ring-1 ring-base ${index ? "-ml-2" : ""}`} style={{ backgroundColor: `${other.info.cursorColor}33`, zIndex: 10 - index }}>
            {avatar ? <img src={avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : initials(name)}
          </div>;
        })}
        {others.length > 5 && <span className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-subtle text-[10px] font-semibold text-copy-secondary ring-1 ring-base" aria-label={`${others.length - 5} more collaborators`}>+{others.length - 5}</span>}
      </div>}
    </div>
    {canvasBounds && cursors.map((other) => {
      const position = other.presence.cursor;
      if (!position) return null;
      const screen = flowToScreenPosition(position);
      const left = screen.x - canvasBounds.left;
      const top = screen.y - canvasBounds.top;
      if (left < -32 || top < -32 || left > canvasBounds.width + 32 || top > canvasBounds.height + 32) return null;
      const name = other.info.name || "Collaborator";
      return <div key={other.connectionId} aria-hidden="true" className="pointer-events-none absolute z-40" style={{ left, top, color: other.info.cursorColor }}>
        <svg className="size-5 drop-shadow-md" viewBox="0 0 20 24" fill="currentColor"><path d="M1 1.5 18.5 13l-7.2 1.1-3.8 7.1L1 1.5Z" stroke="var(--bg-base)" strokeWidth="1.5" strokeLinejoin="round" /></svg>
        <span className="ml-3 -mt-1 block max-w-36 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-base shadow-md" style={{ backgroundColor: other.info.cursorColor }}>{name}</span>
      </div>;
    })}
  </>;
}

function ShapeIcon({ shape }: { shape: NodeShape }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinejoin: "round" as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" {...common}>
      {shape === "rectangle" && <rect x="4" y="6" width="16" height="12" rx="1.5" />}
      {shape === "diamond" && <polygon points="12,3 21,12 12,21 3,12" />}
      {shape === "circle" && <circle cx="12" cy="12" r="8" />}
      {shape === "pill" && <rect x="3" y="7" width="18" height="10" rx="5" />}
      {shape === "cylinder" && <><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>}
      {shape === "hexagon" && <polygon points="7,3.5 17,3.5 22,12 17,20.5 7,20.5 2,12" />}
    </svg>
  );
}

function ShapeSurface({ shape, color, textColor, strokeWidth }: { shape: NodeShape; color: string; textColor: string; strokeWidth: number }) {
  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 border ${shape === "pill" ? "rounded-full" : shape === "circle" ? "rounded-full" : "rounded-md"}`}
        style={{ backgroundColor: color, borderColor: textColor, borderWidth: strokeWidth }}
      />
    );
  }

  const shared = {
    fill: color,
    stroke: textColor,
    strokeWidth,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      {shape === "diamond" && <polygon points="50,2 98,50 50,98 2,50" {...shared} />}
      {shape === "cylinder" && <>
        <path d="M2 16 C2 5 98 5 98 16 V84 C98 95 2 95 2 84 Z" {...shared} />
        <path d="M2 16 C2 27 98 27 98 16" fill="none" stroke={textColor} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      </>}
      {shape === "hexagon" && <polygon points="24,2 76,2 98,50 76,98 24,98 2,50" {...shared} />}
    </svg>
  );
}

function CanvasNodeRenderer({ id, data, selected, dragging }: NodeProps<CanvasNode>) {
  const [isEditing, setIsEditing] = useState(false);
  const labelEditorRef = useRef<HTMLTextAreaElement>(null);
  const updateLabel = useContext(UpdateCanvasNodeLabelContext);
  const updateColor = useContext(UpdateCanvasNodeColorContext);
  const textColor = data.textColor ?? NODE_COLORS.find((color) => color.color === data.color)?.textColor ?? NODE_COLORS[0].textColor;
  const strokeWidth = selected || dragging ? 2.5 : 1.75;

  useLayoutEffect(() => {
    const editor = labelEditorRef.current;
    if (!editor) return;

    editor.style.height = "auto";
    const availableHeight = editor.parentElement?.clientHeight ?? editor.scrollHeight;
    editor.style.height = `${Math.min(editor.scrollHeight, availableHeight)}px`;
  }, [data.label, isEditing]);

  return (
    <div
      className={`group relative flex h-full w-full items-center justify-center px-3 text-lg text-copy-primary transition-shadow ${selected || dragging ? "z-10 drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]" : "drop-shadow-lg"}`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={56}
        keepAspectRatio={data.shape === "circle"}
        color="var(--text-muted)"
        handleClassName="!z-30 !size-4 !rounded-sm !border-2 !border-base !bg-copy-secondary shadow-md"
        lineClassName="!border-copy-muted/50"
      />
      <NodeToolbar isVisible={selected} position={Position.Top} offset={14}>
        <div role="toolbar" aria-label="Node colors" className="nodrag nopan flex items-center gap-1.5 rounded-full border border-surface-border bg-surface/95 px-2 py-1.5 shadow-lg shadow-base/50 backdrop-blur" onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
          {NODE_COLORS.map((color) => {
            const active = data.color === color.color && textColor === color.textColor;
            return <button key={color.color} type="button" aria-label={`Set node color ${color.textColor}`} aria-pressed={active} title={`Set node color ${color.textColor}`} onClick={() => updateColor?.(id, color.color, color.textColor)} className={`nodrag nopan size-5 rounded-full border transition-transform hover:scale-110 hover:shadow-[0_0_7px_1px_var(--swatch-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active ? "ring-2 ring-copy-primary ring-offset-2 ring-offset-surface" : "border-copy-muted/50"}`} style={{ backgroundColor: color.color, borderColor: color.textColor, "--swatch-glow": color.textColor } as React.CSSProperties} />;
          })}
        </div>
      </NodeToolbar>
      <ShapeSurface shape={data.shape} color={data.color} textColor={textColor} strokeWidth={strokeWidth} />
      <span
        onDoubleClick={(event) => {
          event.stopPropagation();
          setIsEditing(true);
        }}
        style={{ color: textColor }}
        className={`nodrag nopan relative z-[1] w-full cursor-text select-none text-center text-lg ${isEditing ? "invisible" : ""}`}
      >
        {data.label || "Double-click to add label"}
      </span>
      {isEditing && (
        <textarea
          ref={labelEditorRef}
          aria-label="Edit node label"
          autoFocus
          rows={1}
          value={data.label}
          onChange={(event) => updateLabel?.(id, event.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              setIsEditing(false);
            }
          }}
          onKeyUp={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          style={{ color: textColor }}
          className="nodrag nopan nowheel absolute left-2 top-1/2 z-[2] m-0 box-border max-h-[calc(100%-1rem)] min-h-6 w-[calc(100%-1rem)] -translate-y-1/2 cursor-text resize-none overflow-auto border-0 bg-transparent p-0 text-center text-lg leading-6 text-copy-primary outline-none placeholder:text-copy-muted"
        />
      )}
      {CANVAS_NODE_HANDLES.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          style={handle.style}
          aria-label={`${handle.type === "source" ? "Start" : "End"} connection at ${handle.position.toLowerCase()}`}
          className="!pointer-events-auto !z-20 !size-3 !cursor-crosshair !border-2 !border-base !bg-copy-primary !opacity-0 transition-opacity group-hover:!opacity-100 group-focus-within:!opacity-100 group-active:!opacity-100"
        />
      ))}
    </div>
  );
}

const nodeTypes = { canvasNode: CanvasNodeRenderer };
const edgeTypes: EdgeTypes = {
  canvasEdge: CanvasEdgeRenderer,
  default: CanvasEdgeRenderer,
  smoothstep: CanvasEdgeRenderer,
  step: CanvasEdgeRenderer,
  straight: CanvasEdgeRenderer,
};
const UpdateCanvasNodeLabelContext = createContext<((id: string, label: string) => void) | null>(null);
const UpdateCanvasNodeColorContext = createContext<((id: string, color: CanvasNode["data"]["color"], textColor: NonNullable<CanvasNode["data"]["textColor"]>) => void) | null>(null);

function ShapeToolbar({ onDragStart, onDragEnd }: { onDragStart: (shape: NodeShape) => void; onDragEnd: () => void }) {
  return (
    <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-xl shadow-base/50 backdrop-blur">
      {NODE_SHAPES.map((shape) => {
        return (
          <button
            key={shape}
            type="button"
            draggable
            aria-label={`Drag ${shape} onto canvas`}
            title={shape}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/ghost-canvas-shape", JSON.stringify({ shape, size: SHAPE_SIZES[shape] }));
              event.dataTransfer.effectAllowed = "copy";
              onDragStart(shape);
            }}
            onDragEnd={onDragEnd}
            className="flex size-9 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-brand active:cursor-grabbing"
          >
            <ShapeIcon shape={shape} />
          </button>
        );
      })}
    </div>
  );
}

function ZoomStableBackground() {
  const { zoom } = useViewport();
  const safeZoom = Math.max(zoom, 0.1);

  return (
    <Background
      variant={BackgroundVariant.Dots}
      bgColor="var(--bg-base)"
      color="var(--border-subtle)"
      gap={24 / safeZoom}
      size={2 / safeZoom}
      className="!z-0"
    />
  );
}

function CanvasFlowContent({ projectId }: { projectId: string }) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      nodes: { initial: [] },
      edges: { initial: [] },
      suspense: true,
    });
  const selectedNodes = useNodes<CanvasNode>().filter((node) => node.selected);
  const selectedEdges = useEdges<CanvasEdge>().filter((edge) => edge.selected);
  const connectionStatus = useStatus();
  const [canvasReady, setCanvasReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadStarted = useRef(false);
  const cleanLoadedSnapshot = useRef(false);
  const saveBaselineApplied = useRef(false);
  const { user } = useUser();
  const updateMyPresence = useUpdateMyPresence();
  const flow = useReactFlow<CanvasNode, CanvasEdge>();
  const saveReady = canvasReady && !loadFailed && connectionStatus === "connected";
  const canQueueSave = !loadFailed && connectionStatus === "connected";
  const canvasSave = useCanvasSave(projectId, nodes, edges, saveReady, canQueueSave);
  const { errorMessage: saveErrorMessage, saveNow, status: saveStatus, isDirty, markClean, markDirty } = canvasSave;
  const { setOnSave, setSaveStatus, setSaveError } = useWorkspaceSave();
  useLayoutEffect(() => {
    if (!canvasReady || saveBaselineApplied.current) return;
    saveBaselineApplied.current = true;
    if (cleanLoadedSnapshot.current) markClean();
    else markDirty();
  }, [canvasReady, markClean, markDirty]);
  useEffect(() => {
    setOnSave(canQueueSave && isDirty ? saveNow : undefined);
    return () => setOnSave(undefined);
  }, [canQueueSave, isDirty, saveNow, setOnSave]);
  useEffect(() => {
    setSaveStatus(saveStatus);
  }, [saveStatus, setSaveStatus]);
  useEffect(() => {
    const unavailableReason = loadFailed
      ? loadError ?? "Canvas could not load. Refresh the page to try again."
      : connectionStatus !== "connected"
        ? "Waiting for the shared canvas connection."
        : !canvasReady
          ? "Loading the saved canvas."
        : !isDirty
          ? "No canvas changes to save yet."
          : null;
    setSaveError(saveErrorMessage ?? unavailableReason);
  }, [canvasReady, connectionStatus, isDirty, loadError, loadFailed, saveErrorMessage, setSaveError]);
  const { screenToFlowPosition, flowToScreenPosition } = flow;
  const { zoom } = useViewport();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useUndo();
  const redo = useRedo();
  const { pendingTemplates, acknowledgeTemplate } = useStarterTemplates();
  const applyingTemplateRef = useRef<QueuedCanvasTemplate & { nodes: CanvasNode[]; edges: CanvasEdge[]; attempted: boolean } | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const scheduleTemplateRetry = useCallback(() => {
    if (retryTimerRef.current) return;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (applyingTemplateRef.current) applyingTemplateRef.current.attempted = false;
      setRetryVersion((version) => version + 1);
    }, 1000);
  }, []);
  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);
  useKeyboardShortcuts({ flow, undo, redo });
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']")) return;
      if (!selectedNodes.length && !selectedEdges.length) return;
      event.preventDefault();
      onDelete({ nodes: selectedNodes, edges: selectedEdges });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDelete, selectedEdges, selectedNodes]);
  useEffect(() => {
    if (connectionStatus !== "connected" || loadStarted.current) return;
    loadStarted.current = true;
    let cancelled = false;
    let completed = false;
    const loadStartedAt = performance.now();
    console.info("[canvas-load] restore started");
    void (async () => {
      try {
        // Liveblocks is the source of truth for an active room. Avoid a Blob
        // request entirely when collaborators have already populated it.
        const currentNodes = flow.getNodes();
        const currentEdges = flow.getEdges();
        if (currentNodes.length > 0 || currentEdges.length > 0) {
          completed = true;
          cleanLoadedSnapshot.current = true;
          setCanvasReady(true);
          console.info("[canvas-load] active room already has content", { durationMs: Math.round(performance.now() - loadStartedAt) });
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        const requestStartedAt = performance.now();
        console.info("[canvas-load] saved snapshot request dispatched");
        let result: { snapshot: { nodes: CanvasNode[]; edges: CanvasEdge[] } | null };
        try {
          const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/canvas`, { cache: "no-store", signal: controller.signal });
          console.info("[canvas-load] saved snapshot response received", { status: response.status, durationMs: Math.round(performance.now() - requestStartedAt) });
          if (!response.ok) {
            let message = `Canvas load failed (${response.status}).`;
            try {
              const body: unknown = await response.json();
              if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") message = body.error;
            } catch { /* Keep the status-based message. */ }
            throw new Error(message);
          }
          result = await response.json();
        } finally {
          clearTimeout(timeout);
        }
        if (cancelled) return;
        // Recheck after the request in case another collaborator edited the
        // room while the saved snapshot was loading.
        const currentNodesAfterLoad = flow.getNodes();
        const currentEdgesAfterLoad = flow.getEdges();
        const roomChangedWhileLoading = currentNodesAfterLoad.length > 0 || currentEdgesAfterLoad.length > 0;
        cleanLoadedSnapshot.current = !roomChangedWhileLoading;
        if (!roomChangedWhileLoading && result.snapshot) {
          if (result.snapshot.nodes.length) onNodesChange(result.snapshot.nodes.map((item) => ({ type: "add" as const, item })));
          if (result.snapshot.edges.length) onEdgesChange(result.snapshot.edges.map((item) => ({ type: "add" as const, item })));
        }
        completed = true;
        setCanvasReady(true);
        console.info("[canvas-load] restore completed", { durationMs: Math.round(performance.now() - loadStartedAt), nodes: result.snapshot?.nodes.length ?? 0, edges: result.snapshot?.edges.length ?? 0 });
      } catch (error) {
        if (!cancelled) {
          completed = true;
          setLoadError(error instanceof Error ? error.message : "Could not load the saved canvas.");
          setLoadFailed(true);
          console.error("[canvas-load] restore failed", { durationMs: Math.round(performance.now() - loadStartedAt), name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Unknown error" });
        }
      }
    })();
    return () => {
      cancelled = true;
      if (!completed) {
        loadStarted.current = false;
        console.warn("[canvas-load] restore cancelled; will retry when the room reconnects", { durationMs: Math.round(performance.now() - loadStartedAt) });
      }
    };
  }, [connectionStatus, flow, onEdgesChange, onNodesChange, projectId]);
  useEffect(() => {
    let applying = applyingTemplateRef.current;
    if (applying) {
      const nodesApplied = applying.nodes.every((node) => nodes.some((current) => current.id === node.id));
      const edgesApplied = applying.edges.every((edge) => edges.some((current) => current.id === edge.id));
      if (nodesApplied && edgesApplied) {
        applyingTemplateRef.current = null;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
        acknowledgeTemplate(applying.id);
        return;
      }
    } else {
      if (connectionStatus !== "connected" || pendingTemplates.length === 0) return;
      const request = pendingTemplates[0];
      const getNodeDimensions = (node: CanvasNode) => ({
        width: Number(node.measured?.width ?? node.width ?? node.style?.width) || 180,
        height: Number(node.measured?.height ?? node.height ?? node.style?.height) || 90,
      });
      const templateBounds = request.template.nodes.reduce((bounds, node) => {
        const size = getNodeDimensions(node);
        return {
          minX: Math.min(bounds.minX, node.position.x),
          minY: Math.min(bounds.minY, node.position.y),
          maxX: Math.max(bounds.maxX, node.position.x + size.width),
          maxY: Math.max(bounds.maxY, node.position.y + size.height),
        };
      }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
      const existingBounds = nodes.reduce((bounds, node) => {
        const size = getNodeDimensions(node);
        return {
          minX: Math.min(bounds.minX, node.position.x),
          minY: Math.min(bounds.minY, node.position.y),
          maxX: Math.max(bounds.maxX, node.position.x + size.width),
          maxY: Math.max(bounds.maxY, node.position.y + size.height),
        };
      }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
      const hasExistingNodes = nodes.length > 0;
      const offsetX = hasExistingNodes ? existingBounds.maxX + 180 - templateBounds.minX : -templateBounds.minX;
      const offsetY = hasExistingNodes ? existingBounds.minY - templateBounds.minY : -templateBounds.minY;
      const nodeIds = new Map<string, string>();
      let nextNodes: CanvasNode[];
      try {
        nextNodes = request.template.nodes.map((node) => {
          const id = createCanvasNodeId(node.data.shape);
          nodeIds.set(node.id, id);
          return {
            ...node,
            id,
            position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
          };
        });
      } catch {
        scheduleTemplateRetry();
        return;
      }
      const nextEdges = request.template.edges.map((edge, index) => {
        const source = nodeIds.get(edge.source);
        const target = nodeIds.get(edge.target);
        if (!source || !target) return null;
        return { ...edge, id: `edge-${source}-${target}-${index}`, source, target };
      }).filter((edge): edge is CanvasEdge => edge !== null);
      applying = { ...request, nodes: nextNodes, edges: nextEdges, attempted: false };
      applyingTemplateRef.current = applying;
    }

    if (connectionStatus !== "connected" || !applying || applying.attempted) return;
    try {
      const newNodes = applying.nodes.filter((node) => !nodes.some((current) => current.id === node.id));
      const newEdges = applying.edges.filter((edge) => !edges.some((current) => current.id === edge.id));
      if (newNodes.length > 0) onNodesChange(newNodes.map((item) => ({ type: "add" as const, item })));
      if (newEdges.length > 0) onEdgesChange(newEdges.map((item) => ({ type: "add" as const, item })));
      requestAnimationFrame(() => {
        void flow.fitView({ nodes: [...nodes, ...applying.nodes], padding: 0.2, duration: 350 });
      });
      applying.attempted = true;
      scheduleTemplateRetry();
    } catch {
      scheduleTemplateRetry();
    }
  }, [pendingTemplates, acknowledgeTemplate, connectionStatus, nodes, edges, onNodesChange, onEdgesChange, flow, scheduleTemplateRetry, retryVersion]);
  const updateNodeLabel = useMutation(({ storage }, id: string, label: string) => {
    const data = storage.get("flow")?.get("nodes").get(id)?.get("data");
    data?.set("label", label);
  }, []);
  const updateEdgeLabel = useMutation(({ storage }, id: string, label: string) => {
    storage.get("flow")?.get("edges").get(id)?.set("label", label);
  }, []);
  const updateNodeColor = useMutation((
    { storage },
    id: string,
    color: CanvasNode["data"]["color"],
    textColor: NonNullable<CanvasNode["data"]["textColor"]>,
  ) => {
    const data = storage.get("flow")?.get("nodes").get(id)?.get("data");
    if (!data) return;
    data.set("color", color);
    data.set("textColor", textColor);
  }, []);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const [canvasBounds, setCanvasBounds] = useState<DOMRect | null>(null);
  useEffect(() => {
    const element = dropTargetRef.current;
    if (!element) return;
    const updateBounds = () => setCanvasBounds(element.getBoundingClientRect());
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(element);
    window.addEventListener("scroll", updateBounds, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateBounds, true);
    };
  }, []);
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    updateMyPresence({ cursor: screenToFlowPosition({ x: event.clientX, y: event.clientY }) });
  }, [screenToFlowPosition, updateMyPresence]);
  const clearCanvasCursor = useCallback(() => updateMyPresence({ cursor: null }), [updateMyPresence]);
  const [dragPreview, setDragPreview] = useState<{ shape: NodeShape; position: { x: number; y: number } | null } | null>(null);
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    setDragPreview((current) => current ? { ...current, position: { x: event.clientX - bounds.left, y: event.clientY - bounds.top } } : current);
  }, []);
  const handleShapeDragStart = useCallback((shape: NodeShape) => setDragPreview({ shape, position: null }), []);
  const clearDragPreview = useCallback(() => setDragPreview(null), []);
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragPreview(null);
    const rawPayload = event.dataTransfer.getData("application/ghost-canvas-shape");
    if (!rawPayload) return;

    const payload = parseCanvasShapeDropPayload(rawPayload);
    if (!payload) return;

    const size = SHAPE_SIZES[payload.shape];
    const cursorPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const position = { x: cursorPosition.x - size.width / 2, y: cursorPosition.y - size.height / 2 };
    let id: string;
    try {
      id = createCanvasNodeId(payload.shape);
    } catch {
      return;
    }
    onNodesChange([{
      type: "add",
      item: {
        id,
        type: "canvasNode",
        position,
        style: { width: size.width, height: size.height },
        data: { label: "", color: NODE_COLORS[0].color, textColor: NODE_COLORS[0].textColor, shape: payload.shape },
      },
    }]);
  }, [onNodesChange, screenToFlowPosition]);
  const statusLabel = {
    initial: "Starting",
    connecting: "Connecting",
    connected: "Live",
    reconnecting: "Reconnecting",
    disconnected: "Offline",
  }[connectionStatus];

  return (
    <div ref={dropTargetRef} className="relative h-full w-full overflow-hidden bg-base" onDragOver={handleDragOver} onDrop={handleDrop} onMouseLeave={clearCanvasCursor}>
      <UpdateCanvasNodeLabelContext.Provider value={updateNodeLabel}>
      <UpdateCanvasNodeColorContext.Provider value={updateNodeColor}>
      <UpdateCanvasEdgeLabelContext.Provider value={updateEdgeLabel}>
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        edges={edges}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        onMouseMove={handleCanvasMouseMove}
        connectionMode={CANVAS_CONNECTION_MODE}
        defaultEdgeOptions={{
          type: "canvasEdge",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--text-primary)" },
          style: { stroke: "var(--text-primary)", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" },
        }}
        deleteKeyCode={[]}
        colorMode="dark"
        minZoom={0.15}
        maxZoom={1.75}
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        preventScrolling
        className="ghost-canvas-flow !absolute !inset-0 !bg-transparent"
      >
        <ZoomStableBackground />
        <Panel position="bottom-right" className="!m-3 !w-fit !max-w-[calc(100%-1.5rem)] !pointer-events-none sm:!m-4">
          <span className="inline-flex w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-surface-border bg-surface/95 px-2.5 py-1 text-[10px] font-medium text-copy-secondary shadow-lg shadow-base/40 backdrop-blur">
            <span className={`size-1.5 rounded-full ${connectionStatus === "connected" ? "bg-state-success" : connectionStatus === "disconnected" ? "bg-state-error" : "bg-state-warning"}`} />
            {statusLabel}
          </span>
        </Panel>
        <CanvasPresence currentUserId={user?.id} flowToScreenPosition={flowToScreenPosition} canvasBounds={canvasBounds} />
      </ReactFlow>
      </UpdateCanvasEdgeLabelContext.Provider>
      </UpdateCanvasNodeColorContext.Provider>
      </UpdateCanvasNodeLabelContext.Provider>

      <ShapeToolbar onDragStart={handleShapeDragStart} onDragEnd={clearDragPreview} />
      <CanvasControlBar flow={flow} canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo} saveStatus={canvasSave.status} onSave={() => void canvasSave.saveNow()} canSave={canQueueSave && isDirty} loadFailed={loadFailed} />

      {dragPreview?.position && (() => {
        const size = SHAPE_SIZES[dragPreview.shape];
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 opacity-60"
            style={{ left: dragPreview.position.x, top: dragPreview.position.y, width: size.width * zoom, height: size.height * zoom }}
          >
            <ShapeSurface shape={dragPreview.shape} color={NODE_COLORS[0].color} textColor={NODE_COLORS[0].textColor} strokeWidth={2} />
          </div>
        );
      })()}

      <div className="pointer-events-none absolute bottom-[4.5rem] left-4 z-10 hidden items-center gap-2 rounded-lg border border-surface-border/80 bg-surface/90 px-3 py-2 text-[10px] text-copy-faint shadow-lg shadow-base/30 backdrop-blur sm:flex">
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 text-copy-muted" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 8h2l1.4-4 2.2 8 1.8-5L11 9h3" /></svg>
        <span>Drag to pan</span>
        <span aria-hidden="true" className="text-copy-faint">·</span>
        <span>Scroll to zoom</span>
      </div>
    </div>
  );
}

export function CanvasFlow({ projectId }: { projectId: string }) {
  return (
    <ReactFlowProvider>
      <CanvasFlowContent projectId={projectId} />
    </ReactFlowProvider>
  );
}
