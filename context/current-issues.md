Review the editor canvas implementation and fix the visual issues. The canvas currently looks like it's floating above the background inside a border box, instead of feeling like a real design canvas. Check `/context/screenshots/image.png` for the current broken state.

Read the current canvas component code in `components/editor`

Issues to look for and document:

DRAG AND DROP ISSUES:

 - Canvas nodes from the node panel cannot be dragged and dropped onto the canvas. Investigate and fix the full drag-and-drop pipeline:
  - Confirm that draggable nodes in the node panel have the correct draggable attribute and onDragStart handler that sets the node type in dataTransfer
  - Confirm that the canvas has onDragOver (with preventDefault to allow dropping) and onDrop handlers wired up correctly
  - Ensure the drop handler reads the node type from dataTransfer, calculates the correct canvas coordinates accounting for pan offset and zoom scale, and creates a new node at the dropped position
  - Check that no parent element is intercepting or blocking the drag events before they reach the canvas

CANVAS VISUAL ISSUES:

- Box shadow or elevation styles making the canvas appear to float
- Border or border-radius giving it a "card" appearance instead of a canvas feel
- Background color mismatch between canvas and its container
- Missing or incorrect dotted background pattern on the canvas
- z-index or positioning (absolute/relative) causing the floating effect
- Padding/margin around the canvas creating separation from the background
- Any wrapper div styles (like rounded corners, shadows, or elevated backgrounds) treating the canvas as a UI card

SIDEBAR ISSUES:

- The left and right sidebars should float OVER the canvas, not push or shrink it
- Sidebars must use position: fixed or position: absolute with a higher z-index so the canvas extends fully behind them
- The canvas background (dotted pattern) should be visible edge-to-edge underneath both sidebars
- Sidebars should have a semi-transparent or solid background with a subtle shadow so they feel elevated above the canvas, not embedded in the layout
- The left sidebar is not fully hiding when toggled off

— it is partially visible or peeking out instead of sliding completely off-screen. When closed, the sidebar should translate fully outside the viewport with no visible remnant. Check for incorrect transform: translateX values, insufficient negative offset, overflow issues on the parent container, or missing overflow: hidden that is causing the sidebar to remain partially visible during or after the close transition.

After documenting all issues fix all of the above so that:

1. The canvas has a dotted background pattern filling the full viewport naturally
2. The canvas feels flush with the surrounding background — no floating, no card effect
3. Box-shadow, excessive borders, and elevated styling are removed from the canvas
4. The canvas looks and feels like an infinite design canvas (similar to Figma or Excalidraw)
5. Both sidebars float over the canvas and are fully hidden when toggled off
6. Nodes can be dragged from the node panel and dropped onto the canvas correctly

## Cross-check Against This Workspace — 2026-11-02

The list above describes issues to investigate, but the matching problems are already addressed in the current editor implementation. The code and `context/screenshots/image.png` were reviewed; no code changes were needed for this audit.

### Drag and drop

- `components/editor/canvas-flow.tsx` exposes draggable toolbar buttons and writes the selected shape plus its dimensions to the custom `application/ghost-canvas-shape` data-transfer type.
- The created React Flow node type is intentionally always `canvasNode`; the dragged shape is stored in `node.data.shape` and controls its renderer. Transferring a different node type would not match this app's node schema.
- The canvas wrapper calls `preventDefault()` during `dragover`, allowing the drop, and handles `drop` to read and validate the payload.
- `screenToFlowPosition()` converts pointer screen coordinates into flow coordinates, accounting for viewport pan and zoom. The resulting node is added through Liveblocks-backed `onNodesChange`.
- The toolbar is inside the same canvas wrapper, and the fixed sidebar overlays are separate siblings. The current code has no parent event handler or closed sidebar intercepting the drop target.

### Canvas visuals

- The active project route and editor layout give the canvas the full area below the fixed navbar. The route section and canvas wrappers have no card border, radius, padding, or shadow.
- React Flow's root is transparent over the base surface, with a dotted `Background` rendered inside the canvas. The screenshot shows the dots extending across the visible canvas. The minimap has its own frame and shadow; those styles belong to the minimap, not the canvas.

### Sidebars

- `ProjectSidebar` and the AI panel use fixed positioning above the canvas, so opening them does not reduce the canvas dimensions. The project sidebar has a translucent surface and shadow.
- Both sidebars start closed. The project sidebar's closed transform moves it beyond the viewport by its full width plus an additional offset, and it is also made transparent, inert, and non-interactive. The AI panel is unmounted while closed.
- The screenshot shows the closed canvas but does not capture an open/close transition; the closed-state behavior was verified from the component logic.

### Outcome

No implementation issue from this checklist reproduced in the current code. Keep this cross-check as context if the online issue list is reused; update the checklist if a new report reproduces one of these symptoms.
