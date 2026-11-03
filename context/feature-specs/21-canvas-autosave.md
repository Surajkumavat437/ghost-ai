Add manual save and loading for the collaborative canvas so project state can be persisted before adding AI generation. Canvas JSON is stored in Vercel Blob, and the saved blob URL is stored on the Prisma project record. Canvas changes remain in the collaborative room until a user clicks Save.

## What to Install

- `@vercel/blob`

## Implementation

1. Check the existing project schema.
   - review `prisma/model/project.prisma`
   - add or reuse a field for the canvas blob URL
   - keep Prisma responsible for metadata only

2. Add canvas save/load API routes.
   Create: `PUT /api/projects/[projectId]/canvas`
   This route should:
   - receive the latest canvas JSON
   - upload the JSON to Vercel Blob
   - store the returned blob URL on the matching Prisma project record

   Create: `GET /api/projects/[projectId]/canvas`
   This route should:
   - read the project’s saved blob URL from Prisma
   - fetch the saved canvas JSON from Vercel Blob
   - return the canvas state to the editor

3. Add a canvas save hook in the `/hooks` folder.
   - keep the latest canvas nodes and edges ready for a manual save
   - save only when the user clicks a Save button
   - keep Save disabled while the current canvas matches its loaded/saved baseline
   - enable Save after persisted graph content changes or a template is imported
   - queue a click made during the initial room restore and send it after the canvas is ready
   - serialize overlapping manual save requests and preserve the latest requested snapshot
   - track save status: idle/unsaved, saving, saved, error

4. Load saved canvas state in the editor.
   - when the editor loads, check if the Liveblocks room has any existing nodes or edges
   - if the room is empty and the project has a saved canvas blob URL, fetch and load the saved canvas state
   - if the room already has nodes or edges, skip the load entirely to avoid overwriting active collaboration

5. Add a small save status indicator in the editor Save button.
   - show saving, saved, or error states

## Storage Pattern

- Prisma stores project metadata and the canvas blob URL.
- Vercel Blob stores the actual canvas JSON.

## Check When Done

- `@vercel/blob` is installed.
- Project schema supports storing the canvas blob URL.
- Save/load routes use Prisma for metadata and Vercel Blob for canvas JSON.
- Canvas edits do not send save requests automatically.
- Navbar and canvas Save buttons persist the current snapshot only when clicked.
- Both Save buttons remain disabled when there are no unsaved graph changes.
- Editor shows save status.
- Saved canvas does not load if the room already has
  active nodes or edges
- `npm run build` passes.
