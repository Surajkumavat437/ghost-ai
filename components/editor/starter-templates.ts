import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import { NODE_COLORS } from "@/types/canvas";

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

function createNode(
  id: string,
  label: string,
  x: number,
  y: number,
  colorIndex: number,
  shape: CanvasNode["data"]["shape"] = "rectangle",
): CanvasNode {
  const palette = NODE_COLORS[colorIndex % NODE_COLORS.length];
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    style: { width: 180, height: 90 },
    data: { label, color: palette.color, textColor: palette.textColor, shape },
  };
}

function createEdge(id: string, source: string, target: string, label?: string): CanvasEdge {
  return { id, source, target, type: "canvasEdge", data: label ? { label } : {} };
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices",
    description: "A gateway routes requests to independent services backed by their own data stores.",
    nodes: [
      createNode("gateway", "API Gateway", 0, 90, 1, "hexagon"),
      createNode("users", "User Service", 280, 0, 2),
      createNode("orders", "Order Service", 280, 180, 3),
      createNode("user-db", "User Database", 560, 0, 6, "cylinder"),
      createNode("order-db", "Order Database", 560, 180, 6, "cylinder"),
    ],
    edges: [
      createEdge("gateway-users", "gateway", "users"),
      createEdge("gateway-orders", "gateway", "orders"),
      createEdge("users-user-db", "users", "user-db"),
      createEdge("orders-order-db", "orders", "order-db"),
    ],
  },
  {
    id: "ci-cd-pipeline",
    name: "CI/CD Pipeline",
    description: "Changes move through automated checks, an artifact registry, and staged deployments.",
    nodes: [
      createNode("source", "Source Control", 0, 0, 1, "pill"),
      createNode("build", "Build & Test", 250, 0, 3),
      createNode("registry", "Artifact Registry", 500, 0, 2, "cylinder"),
      createNode("staging", "Staging", 750, -80, 6),
      createNode("production", "Production", 750, 80, 4),
    ],
    edges: [
      createEdge("source-build", "source", "build", "push"),
      createEdge("build-registry", "build", "registry", "passed"),
      createEdge("registry-staging", "registry", "staging"),
      createEdge("registry-production", "registry", "production", "release"),
    ],
  },
  {
    id: "event-driven",
    name: "Event-Driven System",
    description: "Producers publish events to a broker, which fans them out to independent consumers.",
    nodes: [
      createNode("producer", "Event Producer", 0, 90, 1),
      createNode("broker", "Event Broker", 280, 90, 3, "hexagon"),
      createNode("consumer-a", "Email Consumer", 560, 0, 2),
      createNode("consumer-b", "Analytics Consumer", 560, 180, 6),
    ],
    edges: [
      createEdge("producer-broker", "producer", "broker", "publish"),
      createEdge("broker-email", "broker", "consumer-a", "subscribe"),
      createEdge("broker-analytics", "broker", "consumer-b", "subscribe"),
    ],
  },
];
