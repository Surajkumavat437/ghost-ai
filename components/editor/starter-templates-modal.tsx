"use client";

import { ArrowRight, Boxes, GitBranch, Layers3, Workflow } from "lucide-react";

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
  const width = 520;
  const height = 188;
  const { scale, nodes } = getPreviewLayout(template, width, height);
  const byId = new Map(nodes.map((entry) => [entry.node.id, entry]));

  return (
    <svg aria-hidden="true" className="h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`dots-${template.id}`} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--text-faint)" fillOpacity="0.28" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#dots-${template.id})`} />
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
        const label = node.data.label.length > 14 ? `${node.data.label.slice(0, 13)}…` : node.data.label;
        return <g key={node.id} transform={`translate(${x} ${y})`}>
          <svg x="0" y="0" width={nodeWidth} height={nodeHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
            <PreviewShape shape={node.data.shape} color={node.data.color} textColor={textColor} />
          </svg>
          <text
            x={nodeWidth / 2}
            y={nodeHeight / 2}
            fill={textColor}
            fontSize={Math.max(7, Math.min(10, 10 * scale))}
            textAnchor="middle"
            dominantBaseline="middle"
          >{label}</text>
        </g>;
      })}
    </svg>
  );
}

function getTemplateIcon(id: string) {
  if (id === "microservices") return Layers3;
  if (id === "ci-cd-pipeline") return GitBranch;
  return Workflow;
}

export function StarterTemplatesModal({ open, onOpenChange, onImport }: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 flex max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none rounded-t-3xl border-x-0 border-b-0 border-t border-surface-border bg-base p-0 shadow-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[min(90dvh,60rem)] sm:w-[min(76rem,calc(100%-2rem))] sm:max-w-none sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border">
        <DialogHeader className="shrink-0 border-b border-surface-border bg-surface/70 px-5 pb-4 pt-6 sm:px-8 sm:pb-6 sm:pt-7">
          <div className="flex flex-wrap items-end justify-between gap-4 pr-9">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-accent-dim px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                <Boxes className="size-3.5" /> Starter library
              </div>
              <DialogTitle className="text-xl font-semibold tracking-tight sm:text-[26px]">Start with a system design</DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl text-xs leading-5 sm:text-sm">Choose a pattern to add to your canvas. Every component stays editable.</DialogDescription>
            </div>
            <span className="hidden shrink-0 items-center gap-2 pb-1 text-xs text-copy-muted sm:inline-flex"><span className="size-1.5 rounded-full bg-brand" />{CANVAS_TEMPLATES.length} ready-to-use patterns</span>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-6">
          <div className="grid gap-4 sm:gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))" }}>
            {CANVAS_TEMPLATES.map((template) => (
              <article key={template.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-black/20">
                <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-surface-border bg-base px-4 py-3 sm:h-40 sm:px-5">
                  <TemplatePreview template={template} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-[18px]">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 rounded-md bg-elevated px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-copy-muted">
                      {(() => { const Icon = getTemplateIcon(template.id); return <Icon aria-hidden="true" className="size-3.5 shrink-0 text-brand" />; })()}
                      System pattern
                    </span>
                    <span className="text-[10px] text-copy-faint">{template.edges.length} connections</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold tracking-tight text-copy-primary sm:text-[17px]">{template.name}</h3>
                  <p className="mt-1.5 min-h-10 text-xs leading-[1.55] text-copy-muted sm:text-[13px]">{template.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-border pt-3">
                    <p className="text-[11px] text-copy-muted"><span className="text-copy-primary">{template.nodes.length}</span> components <span className="px-1 text-copy-faint">·</span> <span className="text-copy-primary">{template.edges.length}</span> links</p>
                    <Button
                      className="h-9 gap-2 rounded-xl bg-brand px-3 text-xs font-semibold text-copy-on-brand hover:bg-brand/90"
                      aria-label={`Use ${template.name} template`}
                      onClick={() => {
                        onImport(template);
                        onOpenChange(false);
                      }}
                    >
                      Use template <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
