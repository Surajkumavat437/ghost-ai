import assert from "node:assert/strict";
import test from "node:test";

import { CANVAS_CONNECTION_MODE, CANVAS_NODE_HANDLES } from "@/lib/canvas-connections";
import { Position } from "@xyflow/react";

test("custom canvas nodes expose one aligned source and target anchor on all four sides", () => {
  const expectedSides = [Position.Top, Position.Right, Position.Bottom, Position.Left];
  const ids = CANVAS_NODE_HANDLES.map((handle) => handle.id);

  assert.equal(CANVAS_NODE_HANDLES.length, 8);
  assert.equal(new Set(ids).size, ids.length);
  for (const position of expectedSides) {
    const source = CANVAS_NODE_HANDLES.find((handle) => handle.position === position && handle.type === "source");
    const target = CANVAS_NODE_HANDLES.find((handle) => handle.position === position && handle.type === "target");
    assert.ok(source);
    assert.ok(target);
    assert.deepEqual(source.style, target.style);
  }
  assert.equal(CANVAS_CONNECTION_MODE, "loose");
});
