import assert from "node:assert/strict";
import test from "node:test";

import { createCanvasNodeId, parseCanvasShapeDropPayload, SHAPE_SIZES } from "@/lib/canvas-shapes";
import { NODE_SHAPES } from "@/types/canvas";

test("malformed, null, and structurally invalid drag payloads are ignored", () => {
  assert.equal(parseCanvasShapeDropPayload("{"), null);
  assert.equal(parseCanvasShapeDropPayload("null"), null);
  assert.equal(parseCanvasShapeDropPayload("[]"), null);
  assert.equal(parseCanvasShapeDropPayload('{"shape":"unknown","size":{"width":1,"height":1}}'), null);
});

test("drop payload dimensions must remain finite, positive, and bounded", () => {
  for (const size of [
    { width: 0, height: 10 },
    { width: -1, height: 10 },
    { width: 10, height: 0 },
    { width: 10, height: -1 },
    { width: 1_001, height: 10 },
    { width: 10, height: 1_001 },
    { width: Number.NaN, height: 10 },
  ]) {
    assert.equal(parseCanvasShapeDropPayload(JSON.stringify({ shape: "rectangle", size })), null);
  }
});

test("all supported dropped shapes resolve to canonical dimensions", () => {
  for (const shape of NODE_SHAPES) {
    const payload = parseCanvasShapeDropPayload(JSON.stringify({ shape, size: { width: 999, height: 999 } }));
    assert.ok(payload);
    assert.deepEqual(SHAPE_SIZES[payload.shape], SHAPE_SIZES[shape]);
    assert.notDeepEqual(SHAPE_SIZES[payload.shape], payload.size);
  }
});

test("node IDs are unique across concurrent creators", () => {
  const ids = Array.from({ length: 5_000 }, () => createCanvasNodeId("rectangle", globalThis.crypto, false));
  assert.equal(new Set(ids).size, ids.length);
});

test("in insecure contexts the ID generator uses secure random bytes instead of randomUUID", () => {
  let uuidCalls = 0;
  let randomCalls = 0;
  const cryptoProvider = {
    randomUUID() {
      uuidCalls += 1;
      return "should-not-be-used";
    },
    getRandomValues<T extends ArrayBufferView>(array: T) {
      randomCalls += 1;
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(randomCalls);
      return array;
    },
  } as Crypto;

  const id = createCanvasNodeId("circle", cryptoProvider, false);

  assert.match(id, /^circle-[0-9a-f]{32}$/);
  assert.equal(uuidCalls, 0);
  assert.equal(randomCalls, 1);
});

test("secure contexts may use the browser's randomUUID implementation", () => {
  const cryptoProvider = {
    randomUUID: () => "uuid-from-secure-context",
    getRandomValues: <T extends ArrayBufferView>(array: T) => array,
  } as Crypto;

  assert.equal(createCanvasNodeId("pill", cryptoProvider, true), "pill-uuid-from-secure-context");
});
