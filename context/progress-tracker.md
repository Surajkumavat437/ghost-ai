# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Editor shell and project persistence

## Current Goal

- Implement canvas persistence and starter template import.

## Completed

- Implemented `context/feature-specs/18-starter-template.md`: added typed microservices, CI/CD, and event-driven canvas templates; a scrollable preview-card import dialog; and an editor navbar entry point. Each import now appends a fresh graph beside the current node bounds, preserves existing canvas work, and fits the combined graph into view. `npm.cmd run build` passes on 2026-11-02.
- Fixed Liveblocks React Flow deletion integration by wiring its `onDelete` callback to React Flow so user-initiated node and edge deletions persist correctly.
- Implemented `context/feature-specs/17-canvas-ergonomics.md`: added the bottom-left zoom/fit and Liveblocks undo/redo control bar, added `useKeyboardShortcuts` with editable-field guards for zoom/undo/redo shortcuts, and removed the minimap. Updated the canvas UI context to match. `npm.cmd run build` passes on 2026-11-02.
- Implemented `context/feature-specs/16-edge-behavior.md`: custom smooth-step edge rendering with rounded light strokes, arrows, subtle rest state, hover/selection emphasis, and a wider interaction path; edge labels are positioned from React Flow's path midpoint, edit inline with a width-growing input, and persist through Liveblocks edge changes. New connections use the custom edge type, and legacy built-in edge types render with the custom renderer. Existing four-sided connection handles and loose connections were cross-checked. `npm.cmd run build` passes on 2026-11-02.
- Implemented `context/feature-specs/15-nodes-color-toolbar.md`: selected nodes now show an eight-swatch floating toolbar; selecting a swatch updates the collaborative node background and paired text color immediately, with active-state and hover feedback. Existing nodes without persisted text colors derive them from the defined palette.
- Resolved the four minor canvas/API review findings: collaborator ownership is checked before parsing, invalid/null shape payloads are rejected, dropped nodes use canonical dimensions, and IDs use secure-context UUIDs or cryptographically random bytes. Added focused tests for authorization order, payload validation, dimensions, and ID uniqueness.
- Added four-sided source and target React Flow handles to canvas nodes, with distinct IDs and tests for handle placement and loose connection mode.
- Added durable Liveblocks room cleanup: project deletion atomically records an outbox item, post-commit cleanup is idempotent, failures retry with backoff, stale claims recover, and a secret-protected daily Vercel Cron drains pending work. Provisioning and cleanup share a room lock to prevent deleting rooms for active projects.
- Added tests for transactional outbox behavior and cleanup failure/active-project edge cases. Prisma format, generate, validate, TypeScript, ESLint, and the test suite pass.

- Implemented the shape panel from `context/feature-specs/12-shape-panel.md`: the canvas now has draggable buttons for all six shapes, carries shape and default dimensions in each drag payload, converts drop coordinates through React Flow, creates empty default-colored `canvasNode` entries with timestamp/counter IDs, and renders each shape with matching SVG geometry and a white outline. `npm run build` passes on 2026-11-02.
- Implemented `context/feature-specs/13-node-shape.md`: rectangle, pill, and circle now use CSS surfaces, while diamond, hexagon, and cylinder retain scalable SVG geometry. Added a cursor-following, default-size drag ghost that clears on drop or drag cancellation without changing collaborative node creation. `npm.cmd run build` passes on 2026-11-02.
- Implemented `context/feature-specs/14-node-editing.md`: selected nodes receive minimum-bounded resize controls, and labels edit inline through Liveblocks node replacements with blur/Escape dismissal and canvas drag/pan suppression. Source and target connection handles now share one visible anchor per side while retaining distinct IDs for directional compatibility. The focused connection test and `npm.cmd run build` pass on 2026-11-02; the full suite has two environment-dependent failures because `DATABASE_URL` is unavailable to those tests.
- Clarified canvas cursor states: blank-canvas panning uses grab/grabbing, movable nodes use the move cursor, connection handles use crosshair, and the shape toolbar retains grab/grabbing for drag-and-drop.
- Increased selected-node resize targets from 8px to 16px, raised them above node artwork, and explicitly retained diagonal resize cursors for corner direction clarity.
- Kept the inline label editor visually identical to the centered label while typing: transparent, borderless, and padding-free. It measures its content and remains vertically centered within node bounds.
- Hides the empty-label display prompt as soon as inline editing starts, leaving a blank centered editor ready for typing.
- Set canvas node labels to a consistent 18px text size in both display and inline-edit modes.
- Implemented Liveblocks types for cursor presence, thinking state, and user metadata; added a cached Node client and deterministic cursor colors.
- Added authenticated `POST /api/liveblocks-auth`, with project membership checks, private room creation, and room-scoped write tokens carrying Clerk user name, avatar, and cursor color metadata. `npm run build` passes with the new route in the production route table.
- Added the `Project` and `ProjectCollaborator` Prisma models in `prisma/models/project.prisma`, including the requested status enum, cascade relation, unique constraint, and indexes.
- Added a cached Prisma client singleton in `lib/prisma.ts`, using Prisma Accelerate for `prisma+postgres://` URLs and the PostgreSQL driver adapter for direct URLs.
- Validated and formatted the Prisma schema, generated Prisma Client, and created the initial PostgreSQL migration.
- Applied the initial migration `20261030120000_init` to the configured PostgreSQL database.
- `npm run build` passes with the Prisma client and schema changes.
- Configured `prebuild` to generate Prisma Client automatically before production builds.
- Added authenticated `GET` and `POST /api/projects` handlers for listing the current user's projects and creating projects with the schema's CUID ID strategy and default name.
- Added owner-checked `PATCH` and `DELETE /api/projects/[projectId]` handlers; unauthenticated requests receive `401`, and non-owner mutations receive `403`.
- Allowed project API requests through the Clerk proxy so the handlers return their required JSON authentication responses.
- Verified `npm run build` on 2026-10-31 with `/api/projects` and `/api/projects/[projectId]` present in the production route table; the project API feature remains backend-only.
- Replaced mock project state with server-loaded database projects and API-backed create, rename, and delete actions.
- Added owner and collaborator project lookup using the authenticated Clerk identity and collaborator email.
- Added `/editor/[projectId]` and wired project selection and successful creation to navigate to the selected database project workspace.
- Added refresh and active-workspace redirect behavior after rename and deletion.
- `npm run build` passes with the server-loaded project routes and API-backed dialog mutations.
- Implemented `context/feature-specs/09-share-dialog.md` with the workspace Share button, collaborator list, owner-only email invites/removals, and project-link copy feedback.
- Added authenticated collaborator API routes; list access follows existing owner/verified-email membership checks, while invite and remove enforce project ownership server-side.
- Enriched collaborator records with Clerk display names and avatar URLs, with email-only fallback if no Clerk profile is found or profile lookup is unavailable; no local user table was added.
- `npm run lint`, `npx tsc --noEmit`, `git diff --check`, and `npm run build` pass; the production route table includes both collaborator endpoints.
- Implemented `context/feature-specs/08-editor-workspace-shell.md` at `/editor/[roomId]` as a server page with Clerk identity lookup and owner/collaborator authorization in shared helpers.
- Added the `AccessDenied` state for missing and unauthorized projects, with a return link to `/editor`.
- Added the full-height workspace shell with the project name in the navbar, share and AI sidebar controls, active project highlighting, canvas placeholder, and future AI assistant placeholder.
- `npm run build` passes with `/editor/[roomId]` in the production route table; the build's TypeScript check passes.
- Resolved a runtime named-export error on the workspace page by using the established `getAccessibleProject` data-access helper for its membership check; the page keeps the early unauthenticated redirect.
- Re-ran `npm run lint` and `npm run build` after the fix; both pass, and the production route table still includes `/editor/[roomId]`.
- Separated Next.js development output into `.next-dev` so production builds cannot overwrite a live development server's rendered/client bundles; verified the dev server responds on `/sign-in` and redirects signed-out `/editor/[roomId]` requests to sign-in.
- Added `.next-dev` to Git and ESLint ignores; `npm run lint`, `npx tsc --noEmit`, and `git diff --check` pass.
- Refined the editor UI with a responsive architecture preview, clearer home-page hierarchy, more legible project navigation and selected states, token-based canvas styling, and a responsive AI placeholder panel; no canvas, AI, or share behavior was added.
- Replaced the AI panel close control with a semantic native button so that control no longer depends on the shared `Button` export; lint and TypeScript checks pass.
- Restored the `/editor` landing page to its earlier centered title, description, and New Project action while keeping the workspace UI refinements on `/editor/[roomId]`.
- Refined the AI design agent sidebar with a compact header, consistent spacing, a scrollable content region for short screens, and corrected desktop canvas clearance to match the panel width.
- Set project and AI sidebars to closed by default, reset both to closed on project changes, and close them immediately when selecting another project.
- Refined the collaborative canvas with a connection-status header, intentional empty state, dark themed minimap, subtle pan/zoom hint, and smoother zoom bounds.
- Replaced the workspace canvas placeholder with a client-side Liveblocks room wrapper using `/api/liveblocks-auth`, project ID room authorization, initial null cursor presence, loading UI, and a connection error fallback.
- Added typed canvas node and edge contracts and wired React Flow node and edge state to Liveblocks with suspense, loose connections, fit-to-view, a minimap, and a dot background.
- Re-read `context/feature-specs/11-base-canvas.md` and verified its scope is implemented: server-rendered authorized workspace, Liveblocks providers and room presence, suspense/loading/error states, empty Liveblocks-synced React Flow state, shared canvas types, loose connections, fit-to-view, minimap, and dot background. No extra canvas controls, custom renderers, persistence, or AI behavior were added. `npm run build` passes on 2026-11-02.
- Verified `npm run build` on 2026-11-02; the production build and TypeScript checks pass with `/editor/[roomId]` in the route table.
- Traced the reported Liveblocks authentication 500 to the server log: `LIVEBLOCKS_SECRET_KEY` was absent from both local environment files. Hardened `/api/liveblocks-auth` to reject malformed or oversized room IDs, return `503` for missing server configuration, avoid caching auth responses, and return sanitized JSON for unexpected failures. The key was subsequently configured and verified with a read-only Liveblocks API request.
- Confirmed the configured Liveblocks secret with a read-only Liveblocks API request. Added `/api/liveblocks-auth` to the Clerk proxy's API pass-through list so signed-out callers receive the route's JSON `401`; room access continues to be enforced by Clerk identity and the project membership check inside the handler.
- Re-verified with `npm run lint`, `npx tsc --noEmit`, and `npm run build`; all pass. A direct unauthenticated POST to `/api/liveblocks-auth` returns `401` JSON. A signed-in project-to-room token exchange could not be exercised because the browser access host was unavailable.

- Configured shadcn/ui for Tailwind CSS v4 and generated Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea.
- Installed `lucide-react` and the component runtime dependencies.
- Added the reusable `cn()` helper in `lib/utils.ts`.
- Applied the dark theme palette and shadcn semantic tokens in `app/globals.css`; the root document uses dark mode.
- Implemented the reusable editor navbar and floating project sidebar from `context/feature-specs/02-editor.md`.
- Added a smooth 300 ms slide-and-fade transition for both sidebar opening and closing, using the CSS translate property and honoring reduced-motion preferences.
- Updated the reusable dialog shell with token-based styling for titles, descriptions, and footer actions.
- Added `EditorLayout` to manage sidebar state and compose the navbar, sidebar, and page content; mounted it on the home page.
- Installed `@clerk/ui` and configured the root Clerk provider with its dark theme and app CSS variable overrides.
- Added Clerk sign-in and sign-up pages with the responsive, two-panel auth layout from `context/feature-specs/03-auth.md`; the sign-in page uses Clerk's built-in form card and keeps its default flows intact.
- Added root `proxy.ts` protection with the configured Clerk sign-in and sign-up paths public by default; moved the workspace to `/editor` and added the root auth redirect.
- Added Clerk's built-in `UserButton` to the editor navbar.
- Configured Clerk sign-in and sign-up to redirect directly to `/editor` after successful authentication.
- Self-hosted Geist and Geist Mono with Fontsource so production builds do not depend on reaching Google Fonts; updated `context/ui-context.md` to document font loading.
- Added the minimal `/editor` home with its New Project action and live slug preview.
- Added a dedicated project dialog hook with local mock project state, create/rename/delete dialogs, form state, and loading state.
- Wired sidebar create, rename, and delete actions; only owned projects show actions, and shared projects remain action free.
- Wired project selection from the sidebar to the active editor workspace; the selected project's name is displayed, and deleting it returns to the editor home.
- Added an ASCII code-point slug fallback for Unicode-only project names such as `東京`; slug failures now display inline validation and leave Create open.
- Added a mobile sidebar scrim that closes the sidebar when tapped.
- Restored shadcn fade and zoom animation classes and shortened the close animation to 100 ms for a more immediate response.
- Disabled Rename's Save changes button until the trimmed project name differs from its current name.

## In Progress

- None.

## Next Up

- Add canvas persistence and starter template import; AI generation and spec artifacts remain unwired.

## Open Questions

- Confirm `LIVEBLOCKS_SECRET_KEY` is configured in the deployment secret store; only local `.env` files were checked during this verification.

## Architecture Decisions

- shadcn/ui uses its Base UI primitives with Tailwind CSS v4.

## Session Notes
- Prevented the Clerk `UserButton` hydration mismatch by loading its browser-only mount with `next/dynamic` and reserving its 32px navbar slot during load. Restored a standard 16px inset around the React Flow minimap while keeping its default dimensions.
- Updated custom node rendering to honor all six shape values from the drag payload: rectangle, diamond, circle, pill, cylinder, and hexagon now have distinct SVG geometry and white outlines that strengthen during selection and movement. Updated the shape-panel feature spec to reflect the delivered visuals.
- Fixed the active editor viewport height by anchoring its canvas directly below the fixed navbar, removing the 56px shrink caused by combining `h-dvh` with top padding. Kept the canvas full width when the AI slide-over opens, made React Flow wheel/pinch zoom settings explicit, increased live/loading dot contrast, and added a bright white node outline while selected or dragged.
- Implemented `context/feature-specs/12-shape-panel.md` in `components/editor/canvas-flow.tsx`. The first build exposed missing icon modules in the installed Lucide package, so this canvas uses small inline SVG glyphs; the subsequent `npm.cmd run build` completed successfully, including type checking and route generation.
- Implemented `context/feature-specs/12-shape-panel.md`: added a bottom-center draggable shape toolbar, shape and size drag payloads, drop coordinate conversion, timestamp/counter IDs, default node data, and a basic `canvasNode` renderer. Production build verification is in progress.
- Read `context/feature-specs/10-liveblocks-setup.md` and implemented the typed Liveblocks presence/user metadata, cached node client, stable user cursor-color mapping, and authenticated `/api/liveblocks-auth` route. The route checks existing project membership, creates a private room if needed, and attaches Clerk name/avatar/color metadata to a room-write session.
- Added `@liveblocks/node` to the project dependencies because it was missing from `node_modules` and `package.json` despite the feature spec's dependency note. The SDK is now installed and the production build passes.
- Fixed the PostgreSQL driver deprecation/security warning by changing the local `DATABASE_URL` SSL mode from `require` to `verify-full` in `.env` and `.env.local`; this preserves the current full hostname-verification behavior while making it explicit.
- Audited current frontend-to-backend wiring: the editor project list loads on the server through Clerk-authenticated access helpers; create, rename, and delete dialogs call project API routes; project pages verify membership before rendering. Owner-only rename/delete checks and unauthenticated `401` responses are enforced in the route handlers.
- The initial audit found the project workspace placeholder and no Liveblocks wiring. The room authorization and collaborative canvas foundation are now implemented; canvas persistence to Blob, starter template import, Trigger.dev generation, and spec generation/download remain unwired.
- Fixed CodeRabbit findings across project APIs and dialogs: shared trimmed 1–100 character name validation, PATCH `P2025` to `404` handling, atomic owner-scoped deletes with race-safe `403`/`404` results, one inline validation alert, and visible delete errors.
- Made owner project queries independent from Clerk profile lookup failures and restricted collaborator access to case-insensitive matches against verified Clerk email addresses only.
- Added Node test coverage for project name validation, P2025 classification, verified-email filtering and lookup failures, and concurrent/unauthorized project deletion outcomes.

- Addressed verified CodeRabbit PR findings: auth route config now fails closed unless it targets the implemented sign-in/sign-up routes; corrected Clerk token-context, org-scoped deletion, input-validation, Route Handler, server/client, Markdown, and eval examples; reverted the generated Tabs wrapper edit.

- Hardened both duplicated standalone Clerk JWT verification examples with required issuer and authorized-party allowlist checks before consuming `sub`; used the installed SDK's `data`/`errors` result shape.

- Fixed the editor navbar user menu positioning by overriding Clerk's shared full-width centered `rootBox` appearance for `UserButton`; it now sizes to its content inside the right-aligned navbar slot.

- Added Suspense boundaries around Clerk's sign-in and sign-up forms to satisfy Next.js 16 URL-data prerendering, while keeping `instant = false` on auth routes. Added the same opt-out on `/`, which reads Clerk auth state at request time. Restored local Clerk route URLs in `.env.local` so localhost redirects to the app's own forms, and consolidated both auth pages on one shared, responsive layout.

- Updated the auth information panel copy and feature rows to match the provided login reference, and adjusted Clerk card spacing and field-label styling while preserving Clerk's built-in sign-in methods and account flows.

- Fixed secondary button hover to use defined theme tokens and forwarded Tabs orientation to its Base UI root.
- Added a postinstall recovery script for the missing Lucide generated ESM module; verified it reconstructs the file and Lucide icons import successfully.

- Restored the missing `lucide-react` ESM `defaultAttributes.mjs` from the installed source map; direct icon imports now load. Production build reaches font loading but cannot fetch Geist from Google Fonts in this offline environment.
- Read the editor feature spec and project context; the current unit is limited to reusable chrome and dialog styling.
- Next.js 16 server/client component guidance was reviewed before implementation.
- Added `EditorNavbar` and `ProjectSidebar` as reusable client components with controlled open/close state.
- Updated the existing dialog primitives to use the shared dark tokens and modal radius, with title, description, and footer action styling ready for later dialogs.
- TypeScript (`tsc --noEmit`) and ESLint (`npm run lint`) completed without errors.
- Read `context/feature-specs/03-auth.md` and implemented its Clerk provider, auth pages, default route protection, root redirects, and navbar user menu requirements.
- The first production build attempt was blocked by unavailable Google Fonts network access; moved the existing Geist typography to self-hosted Fontsource packages and updated the UI context.
- Added the Next.js 16 `instant = false` opt-out and Suspense boundaries required for authenticated root redirects and Clerk's client-rendered auth forms with Cache Components enabled.
- `npm run build`, `npx tsc --noEmit`, and `npm run lint` complete successfully.
- After Clerk keys were added to `.env.local`, verified both expected key names are populated without printing values, Clerk's read-only instance endpoint accepts the secret key, and browser-style auth route requests complete the development handshake: `/sign-in` and `/sign-up` return 200, while unauthenticated `/` and `/editor` redirect to sign-in.
- Replaced Clerk's deprecated route matcher helper with an equivalent path check based on the configured sign-in and sign-up URLs; repeated the HTTP route check and build/lint successfully.
- Re-read `context/feature-specs/03-auth.md` and verified the implementation includes the centered built-in sign-in card, token-based Clerk theme, root redirect, default route protection, and editor user menu; `npm run build` passes on Next.js 16.4.3.
- Passed Clerk's installed `ui` package export into `ClerkProvider` to pin the UI component version and address Clerk's `structural_css_pin_clerk_ui` console warning.
- Investigated the pasted browser console output: this repository does not configure Permissions-Policy, Content-Security-Policy, or Sentry; the blocked Sentry requests are client-side blocking, and the reported header warnings do not identify an app code failure.
- After the Clerk UI pin change, `npm run build`, `npm run lint`, and `npx tsc --noEmit` all complete successfully.
- Refined the auth screen into a 50/50 dark split layout with a token-colored feature panel, compact icon rows, centered Clerk form, and Geist Sans/Mono applied to Clerk components.
- Updated the auth feature spec and UI context to document the screenshot-aligned split layout and feature rows.
- Tightened the auth information panel to match the spec's compact presentation: shorter tagline, smaller heading, tighter spacing, and smaller feature icons. The Clerk sign-in card and its default flows remain in place.
- Smoothed the editor sidebar's open and close slide and fade with a 300 ms in-out transition on the CSS translate and opacity properties, plus a fully offscreen closed position and reduced-motion support.
- Fixed the post-auth pause on the login page by setting explicit `/editor` destinations on both Clerk auth forms, bypassing the intermediate root redirect.
- Corrected Clerk Core 3 appearance configuration to pass the installed `dark` theme through the `theme` property, then apply app CSS-variable overrides and raised card styling. The prior spread supplied theme fields without selecting the base theme.
- Made Clerk's card, primary button, input, social buttons, and headings explicitly use Ghost AI theme tokens. Moved the two-panel auth layout to the `md` breakpoint so branding appears on tablet landscape widths while remaining hidden on small screens; verified Tailwind v4 generated the required token and responsive utilities.
- Fixed inconsistent Clerk appearance across sign-in and sign-up by defining one shared appearance using the installed `@clerk/ui/themes` dark theme, Ghost AI CSS variables, and self-hosted Geist font variables; passed the pinned `ui` package to `ClerkProvider`.
- Removed hardcoded hex appearance overrides from sign-in and aligned both forms to the same responsive layout and Clerk element styling. Added a Tailwind color token for the primary button's foreground so its text utility resolves to the base background color.
- Verified generated production CSS includes the `md:grid-cols-2` desktop layout utility and the custom `text-copy-on-brand` token utility; the installed Geist and Geist Mono font files are emitted with the build.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass after the auth styling fix. Browser screenshots could not be inspected because the browser access host was unavailable; desktop/mobile visual QA remains pending.
- Official Clerk Tailwind v4 guidance identified the missing cascade configuration: Tailwind utility styles must be ordered after Clerk's styles using `cssLayerName` and `@layer theme, base, clerk, components, utilities`. Added that configuration so Clerk's styles no longer override the appearance element utility classes.
- Rebuilt after the cascade fix; production CSS includes the `clerk` component layer and the utility layer after it. Lint, TypeScript, and production build pass. Browser visual verification remains pending.

- Merged the latest origin/main changes into uthentication-implementation; retained the incoming secondary-button token and Tabs orientation fixes alongside authentication review work.
- Merged the latest `origin/main` changes into `authentication-implementation`; retained the incoming secondary-button token and Tabs orientation fixes alongside authentication review work.
- Fixed project dialog dismissal flicker by retaining the active form or confirmation content until Base UI's `onOpenChangeComplete(false)` callback ends the exit lifecycle. TypeScript, ESLint, production build, and `git diff --check` pass; interactive browser verification remains pending because the browser control host is unavailable.
- Addressed CodeRabbit feedback: sidebar selection now opens the selected mock project's workspace, and Unicode-only names get an ASCII slug fallback with a validation guard that keeps Create open if slug generation fails.
- Fixed share dialog refresh failures so stale collaborator counts and lists are hidden while the error remains visible; moved POST body parsing and email validation ahead of project lookup and ownership checks. Clerk collaborator profile lookups query only collaborator emails in batches capped at the API's 100-address limit and preserve the first mapped verified address.
- Expanded the collaborative React Flow canvas to fill the editor workspace, removed the inset frame and in-canvas title/empty-state overlays, and fixed the dot pattern stacking against React Flow's opaque dark background. Retained the room status, minimap, and pan/zoom hint.
- Matched the Liveblocks suspense/loading fallback to the full-size dotted canvas and added a compact connecting indicator so initial room synchronization no longer appears as a blank block before React Flow mounts.
- Increased dot size and contrast using the existing faint-text token, and moved room connection status into a compact React Flow panel at the bottom-right; mirrored that placement in the loading fallback.
- Set active project layout to a fixed viewport height with overflow clipped and a zero-min-height canvas section; made the dot grid retain a stable screen-space size and spacing through zoom, and made the status panel content-sized and pass-through for canvas pointer events.
