"use client";

import { ArrowRight, Boxes } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates";

interface StarterTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (template: CanvasTemplate) => void;
}

function getPreviewLayout(template: CanvasTemplate, width: number, height: number) {
  const bounds = template.nodes.reduce((result, node) => {
    const nodeWidth = Number(node.style?.width) || 180;
    const nodeHeight = Number(node.style?.height) || 90;
    return {
      minX: Math.min(result.minX, node.position.x),
      minY: Math.min(result.minY, node.position.y),
      maxX: Math.max(result.maxX, node.position.x + nodeWidth),
      maxY: Math.max(result.maxY, node.position.y + nodeHeight),
    };
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const padding = 18;
  const scale = Math.min(
    (width - padding * 2) / Math.max(1, bounds.maxX - bounds.minX),
    (height - padding * 2) / Math.max(1, bounds.maxY - bounds.minY),
  );
  const nodes = template.nodes.map((node) => {
    const nodeWidth = Number(node.style?.width) || 180;
    const nodeHeight = Number(node.style?.height) || 90;
    return {
      node,
      x: padding + (node.position.x - bounds.minX) * scale,
      y: padding + (node.position.y - bounds.minY) * scale,
      width: nodeWidth * scale,
      height: nodeHeight * scale,
    };
  });
  return { scale, nodes };
}

function PreviewShape({
  shape,
  color,
  textColor,
}: {
  shape: CanvasTemplate["nodes"][number]["data"]["shape"];
  color: string;
  textColor: string;
}) {
  const shared = { fill: color, stroke: textColor, strokeWidth: 1.5, vectorEffect: "non-scaling-stroke" as const };
  if (shape === "rectangle") return <rect x="1" y="1" width="98" height="98" rx="9" {...shared} />;
  if (shape === "pill") return <rect x="1" y="1" width="98" height="98" rx="48" {...shared} />;
  if (shape === "circle") return <ellipse cx="50" cy="50" rx="49" ry="49" {...shared} />;
  if (shape === "diamond") return <polygon points="50,1 99,50 50,99 1,50" {...shared} />;
  if (shape === "hexagon") return <polygon points="24,1 76,1 99,50 76,99 24,99 1,50" {...shared} />;
  return <>
    <path d="M1 16 C1 -4 99 -4 99 16 V84 C99 104 1 104 1 84 Z" {...shared} />
    <path d="M1 16 C1 36 99 36 99 16" fill="none" stroke={textColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
  </>;
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const width = 320;
  const height = 132;
  const { scale, nodes } = getPreviewLayout(template, width, height);
  const byId = new Map(nodes.map((entry) => [entry.node.id, entry]));

  return (
    <svg aria-hidden="true" className="h-[132px] w-full rounded-xl border border-surface-border bg-base/70" viewBox={`0 0 ${width} ${height}`}>
      {template.edges.map((edge) => {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target) return null;
        return <line
          key={edge.id}
          x1={source.x + source.width / 2}
          y1={source.y + source.height / 2}
          x2={target.x + target.width / 2}
          y2={target.y + target.height / 2}
          stroke="var(--text-muted)"
          strokeWidth="1.25"
        />;
      })}
      {nodes.map(({ node, x, y, width: nodeWidth, height: nodeHeight }) => {
        const textColor = node.data.textColor ?? node.data.color;
        const label = node.data.label.length > 18 ? `${node.data.label.slice(0, 17)}…` : node.data.label;
        return <g key={node.id} transform={`translate(${x} ${y})`}>
          <svg x="0" y="0" width={nodeWidth} height={nodeHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
            <PreviewShape shape={node.data.shape} color={node.data.color} textColor={textColor} />
          </svg>
          <text
            x={nodeWidth / 2}
            y={nodeHeight / 2}
            fill={textColor}
            fontSize={Math.max(6, Math.min(9, 9 * scale))}
            textAnchor="middle"
            dominantBaseline="middle"
          >{label}</text>
        </g>;
      })}
    </svg>
  );
}

export function StarterTemplatesModal({ open, onOpenChange, onImport }: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88dvh,48rem)] w-[min(56rem,calc(100%-2rem))] max-w-none flex-col gap-5 overflow-hidden p-5 sm:p-6">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg border border-brand/20 bg-accent-dim text-brand"><Boxes className="size-4" /></span>
            Starter templates
          </DialogTitle>
          <DialogDescription>Choose a system design to replace the current canvas.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CANVAS_TEMPLATES.map((template) => (
              <article key={template.id} className="flex min-w-0 flex-col rounded-2xl border border-surface-border bg-surface p-3.5 transition-colors hover:border-brand/40">
                <TemplatePreview template={template} />
                <h3 className="mt-3 text-sm font-semibold text-copy-primary">{template.name}</h3>
                <p className="mt-1 min-h-10 text-xs leading-5 text-copy-muted">{template.description}</p>
                <Button
                  className="mt-3 w-full justify-between bg-accent-dim text-brand hover:bg-brand/20"
                  onClick={() => {
                    onImport(template);
                    onOpenChange(false);
                  }}
                >
                  Import template <ArrowRight className="size-4" />
                </Button>
              </article>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
