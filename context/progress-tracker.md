# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Authentication and route protection

## Current Goal

- Clerk authentication is wired into the app, the editor workspace is protected, and both auth forms share the Ghost AI theme.

## Completed

- Configured shadcn/ui for Tailwind CSS v4 and generated Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea.
- Installed `lucide-react` and the component runtime dependencies.
- Added the reusable `cn()` helper in `lib/utils.ts`.
- Applied the dark theme palette and shadcn semantic tokens in `app/globals.css`; the root document uses dark mode.
- Implemented the reusable editor navbar and floating project sidebar from `context/feature-specs/02-editor.md`.
- Updated the reusable dialog shell with token-based styling for titles, descriptions, and footer actions.
- Added `EditorLayout` to manage sidebar state and compose the navbar, sidebar, and page content; mounted it on the home page.
- Installed `@clerk/ui` and configured the root Clerk provider with its dark theme and app CSS variable overrides.
- Added Clerk sign-in and sign-up pages with the responsive, two-panel auth layout from `context/feature-specs/03-auth.md`; the sign-in page uses Clerk's built-in form card and keeps its default flows intact.
- Added root `proxy.ts` protection with the configured Clerk sign-in and sign-up paths public by default; moved the workspace to `/editor` and added the root auth redirect.
- Added Clerk's built-in `UserButton` to the editor navbar.
- Self-hosted Geist and Geist Mono with Fontsource so production builds do not depend on reaching Google Fonts; updated `context/ui-context.md` to document font loading.

## In Progress

- Browser visual QA of the screenshot-aligned Clerk login remains pending; browser access was unavailable in the prior attempt.

## Next Up

- Inspect both auth routes at desktop and mobile sizes when browser access is available.

## Open Questions

- None.

## Architecture Decisions

- shadcn/ui uses its Base UI primitives with Tailwind CSS v4.

## Session Notes

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
