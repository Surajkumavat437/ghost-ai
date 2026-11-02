"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
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
  type NodeProps,
  type EdgeTypes,
} from "@xyflow/react";
import { useCanRedo, useCanUndo, useRedo, useStatus, useUndo } from "@liveblocks/react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

import { createCanvasNodeId, parseCanvasShapeDropPayload, SHAPE_SIZES } from "@/lib/canvas-shapes";
import { CANVAS_CONNECTION_MODE, CANVAS_NODE_HANDLES } from "@/lib/canvas-connections";
import { NODE_COLORS, NODE_SHAPES, type CanvasEdge, type CanvasNode, type NodeShape } from "@/types/canvas";
import { CanvasEdgeRenderer, UpdateCanvasEdgeLabelContext } from "@/components/editor/canvas-edge";
import { CanvasControlBar } from "@/components/editor/canvas-control-bar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useStarterTemplates } from "@/components/editor/starter-templates-context";

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

function CanvasFlowContent() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      nodes: { initial: [] },
      edges: { initial: [] },
      suspense: true,
    });
  const connectionStatus = useStatus();
  const flow = useReactFlow<CanvasNode, CanvasEdge>();
  const { screenToFlowPosition, getNode, getEdge } = flow;
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useUndo();
  const redo = useRedo();
  const { pendingTemplate, consumePendingTemplate } = useStarterTemplates();
  useKeyboardShortcuts({ flow, undo, redo });
  useEffect(() => {
    if (!pendingTemplate) return;

    const getNodeDimensions = (node: CanvasNode) => ({
      width: Number(node.measured?.width ?? node.width ?? node.style?.width) || 180,
      height: Number(node.measured?.height ?? node.height ?? node.style?.height) || 90,
    });
    const templateBounds = pendingTemplate.nodes.reduce((bounds, node) => {
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
    let nextNodes: CanvasNode[];
    const nodeIds = new Map<string, string>();
    try {
      nextNodes = pendingTemplate.nodes.map((node) => {
        const id = createCanvasNodeId(node.data.shape);
        nodeIds.set(node.id, id);
        return {
          ...node,
          id,
          position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
        };
      });
    } catch {
      consumePendingTemplate();
      return;
    }
    const nextEdges = pendingTemplate.edges.map((edge, index) => {
      const source = nodeIds.get(edge.source);
      const target = nodeIds.get(edge.target);
      if (!source || !target) return null;
      return { ...edge, id: `edge-${source}-${target}-${index}`, source, target };
    }).filter((edge): edge is CanvasEdge => edge !== null);

    // Add fresh identities beside the existing graph; do not mutate prior canvas work.
    onNodesChange(nextNodes.map((item) => ({ type: "add" as const, item })));
    onEdgesChange(nextEdges.map((item) => ({ type: "add" as const, item })));
    requestAnimationFrame(() => {
      void flow.fitView({ nodes: [...nodes, ...nextNodes], padding: 0.2, duration: 350 });
    });
    consumePendingTemplate();
  }, [pendingTemplate, consumePendingTemplate, nodes, edges, onNodesChange, onEdgesChange, onDelete, flow]);
  const updateNodeLabel = useCallback((id: string, label: string) => {
    const node = getNode(id);
    if (!node) return;
    onNodesChange([{ type: "replace", id, item: { ...node, data: { ...node.data, label } } }]);
  }, [getNode, onNodesChange]);
  const updateEdgeLabel = useCallback((id: string, label: string) => {
    const edge = getEdge(id);
    if (!edge) return;
    onEdgesChange([{ type: "replace", id, item: { ...edge, data: { ...edge.data, label } } }]);
  }, [getEdge, onEdgesChange]);
  const updateNodeColor = useCallback((id: string, color: CanvasNode["data"]["color"], textColor: NonNullable<CanvasNode["data"]["textColor"]>) => {
    const node = getNode(id);
    if (!node) return;
    onNodesChange([{ type: "replace", id, item: { ...node, data: { ...node.data, color, textColor } } }]);
  }, [getNode, onNodesChange]);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const [dragPreview, setDragPreview] = useState<{ shape: NodeShape; x: number; y: number } | null>(null);
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    setDragPreview((current) => current ? { ...current, x: event.clientX - bounds.left, y: event.clientY - bounds.top } : current);
  }, []);
  const handleShapeDragStart = useCallback((shape: NodeShape) => setDragPreview({ shape, x: 0, y: 0 }), []);
  const clearDragPreview = useCallback(() => setDragPreview(null), []);
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragPreview(null);
    const rawPayload = event.dataTransfer.getData("application/ghost-canvas-shape");
    if (!rawPayload) return;

    const payload = parseCanvasShapeDropPayload(rawPayload);
    if (!payload) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    let id: string;
    try {
      id = createCanvasNodeId(payload.shape);
    } catch {
      return;
    }
    const size = SHAPE_SIZES[payload.shape];
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
    <div ref={dropTargetRef} className="relative h-full w-full overflow-hidden bg-base" onDragOver={handleDragOver} onDrop={handleDrop}>
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
        connectionMode={CANVAS_CONNECTION_MODE}
        defaultEdgeOptions={{
          type: "canvasEdge",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--text-primary)" },
          style: { stroke: "var(--text-primary)", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" },
        }}
        fitView
        colorMode="dark"
        minZoom={0.15}
        maxZoom={1.75}
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        preventScrolling
        className="ghost-canvas-flow !bg-transparent"
      >
        <ZoomStableBackground />
        <Panel position="bottom-right" className="!m-3 !w-fit !max-w-[calc(100%-1.5rem)] !pointer-events-none sm:!m-4">
          <span className="inline-flex w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-surface-border bg-surface/95 px-2.5 py-1 text-[10px] font-medium text-copy-secondary shadow-lg shadow-base/40 backdrop-blur">
            <span className={`size-1.5 rounded-full ${connectionStatus === "connected" ? "bg-state-success" : connectionStatus === "disconnected" ? "bg-state-error" : "bg-state-warning"}`} />
            {statusLabel}
          </span>
        </Panel>
      </ReactFlow>
      </UpdateCanvasEdgeLabelContext.Provider>
      </UpdateCanvasNodeColorContext.Provider>
      </UpdateCanvasNodeLabelContext.Provider>

      <ShapeToolbar onDragStart={handleShapeDragStart} onDragEnd={clearDragPreview} />
      <CanvasControlBar flow={flow} canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo} />

      {dragPreview && (() => {
        const size = SHAPE_SIZES[dragPreview.shape];
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 opacity-60"
            style={{ left: dragPreview.x, top: dragPreview.y, width: size.width, height: size.height }}
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

export function CanvasFlow() {
  return (
    <ReactFlowProvider>
      <CanvasFlowContent />
    </ReactFlowProvider>
  );
}
