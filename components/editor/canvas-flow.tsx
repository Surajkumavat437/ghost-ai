"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
  Panel,
  ReactFlow,
  useReactFlow,
  useViewport,
  type NodeProps,
} from "@xyflow/react";
import { useStatus } from "@liveblocks/react";
import { useCallback, useRef } from "react";

import { createCanvasNodeId, parseCanvasShapeDropPayload, SHAPE_SIZES } from "@/lib/canvas-shapes";
import { CANVAS_CONNECTION_MODE, CANVAS_NODE_HANDLES } from "@/lib/canvas-connections";
import { NODE_COLORS, NODE_SHAPES, type CanvasEdge, type CanvasNode, type NodeShape } from "@/types/canvas";

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

function ShapeSurface({ shape, color, strokeWidth }: { shape: NodeShape; color: string; strokeWidth: number }) {
  const shared = {
    fill: color,
    stroke: "var(--text-primary)",
    strokeWidth,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      {shape === "rectangle" && <rect x="1" y="1" width="98" height="98" rx="5" {...shared} />}
      {shape === "diamond" && <polygon points="50,2 98,50 50,98 2,50" {...shared} />}
      {shape === "circle" && <ellipse cx="50" cy="50" rx="48" ry="48" {...shared} />}
      {shape === "pill" && <rect x="1" y="8" width="98" height="84" rx="42" {...shared} />}
      {shape === "cylinder" && <>
        <path d="M2 16 C2 5 98 5 98 16 V84 C98 95 2 95 2 84 Z" {...shared} />
        <path d="M2 16 C2 27 98 27 98 16" fill="none" stroke="var(--text-primary)" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      </>}
      {shape === "hexagon" && <polygon points="24,2 76,2 98,50 76,98 24,98 2,50" {...shared} />}
    </svg>
  );
}

function CanvasNodeRenderer({ data, selected, dragging }: NodeProps<CanvasNode>) {
  const strokeWidth = selected || dragging ? 2.5 : 1.75;

  return (
    <div
      className={`group relative flex h-full w-full items-center justify-center px-3 text-sm text-copy-primary transition-shadow ${selected || dragging ? "z-10 drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]" : "drop-shadow-lg"}`}
    >
      <ShapeSurface shape={data.shape} color={data.color} strokeWidth={strokeWidth} />
      <span className="relative z-[1] text-center">{data.label}</span>
      {CANVAS_NODE_HANDLES.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          style={handle.style}
          aria-label={`${handle.type === "source" ? "Start" : "End"} connection at ${handle.position.toLowerCase()}`}
          className="!pointer-events-auto !z-20 !size-3 !border-2 !border-base !bg-copy-primary !opacity-0 transition-opacity group-hover:!opacity-100 group-focus-within:!opacity-100 group-active:!opacity-100"
        />
      ))}
    </div>
  );
}

const nodeTypes = { canvasNode: CanvasNodeRenderer };

function ShapeToolbar() {
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
            }}
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
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      nodes: { initial: [] },
      edges: { initial: [] },
      suspense: true,
    });
  const connectionStatus = useStatus();
  const { screenToFlowPosition } = useReactFlow<CanvasNode, CanvasEdge>();
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
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
        data: { label: "", color: NODE_COLORS[0].color, shape: payload.shape },
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
    <div ref={dropTargetRef} className="relative h-full w-full overflow-hidden bg-base" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={CANVAS_CONNECTION_MODE}
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--text-muted)" },
          style: { stroke: "var(--text-muted)", strokeWidth: 1.5 },
        }}
        fitView
        colorMode="dark"
        minZoom={0.15}
        maxZoom={1.75}
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        preventScrolling
        className="!bg-transparent"
      >
        <MiniMap<CanvasNode>
          nodeColor={(node) => node.data.color}
          ariaLabel="Canvas minimap"
          position="top-right"
          bgColor="var(--bg-surface)"
          className="!m-4 !overflow-hidden !rounded-xl !border !border-surface-border !shadow-lg !shadow-base/40"
          maskColor="color-mix(in srgb, var(--bg-base) 72%, transparent)"
          pannable
          zoomable
        />
        <ZoomStableBackground />
        <Panel position="bottom-right" className="!m-3 !w-fit !max-w-[calc(100%-1.5rem)] !pointer-events-none sm:!m-4">
          <span className="inline-flex w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-surface-border bg-surface/95 px-2.5 py-1 text-[10px] font-medium text-copy-secondary shadow-lg shadow-base/40 backdrop-blur">
            <span className={`size-1.5 rounded-full ${connectionStatus === "connected" ? "bg-state-success" : connectionStatus === "disconnected" ? "bg-state-error" : "bg-state-warning"}`} />
            {statusLabel}
          </span>
        </Panel>
      </ReactFlow>

      <ShapeToolbar />

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden items-center gap-2 rounded-lg border border-surface-border/80 bg-surface/90 px-3 py-2 text-[10px] text-copy-faint shadow-lg shadow-base/30 backdrop-blur sm:flex">
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
