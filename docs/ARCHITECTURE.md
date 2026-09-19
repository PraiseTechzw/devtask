# DevTask architecture

DevTask is a universal Expo application backed by Convex. The client owns navigation and interaction state. Convex owns authenticated data access and server-side integrations. Clerk supplies identity, and GitHub supplies repository activity signals.

## Runtime layers

### Client

The application entry point is `src/app/_layout.tsx`. Expo Router maps files under `src/app/` to screens. The `(app)` group contains the authenticated shell and tab navigation. Shared presentation components are in `src/components/`, while theme values are centralized in `src/constants/theme.ts` and `src/global.css`.

The client reads `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_CONVEX_URL`. These values are required to start the app. The client must never receive GitHub client secrets, access tokens, or the token encryption key.

### Authentication

Clerk wraps the root layout and provides the signed-in identity. Convex verifies the Clerk JWT using `convex/auth.config.ts`. Screens such as sign-in, sign-up, password recovery, and email verification implement the authentication journey. Authenticated routes should use Convex ownership checks rather than trusting client-provided user identifiers.

### Convex backend

The backend is organized by domain:

- `convex/schema.ts` defines users, projects, features, checklist items, GitHub connections, OAuth state, and repository records.
- `convex/users.ts` manages the authenticated user profile and onboarding state.
- `convex/projects.ts` manages project lifecycle, focus, progress, and project-level health data.
- `convex/features.ts` manages feature and checklist state.
- `convex/github.ts` handles GitHub connection and repository-related actions.
- `convex/http.ts` exposes HTTP endpoints required for OAuth callbacks and external integration flows.

Each query and mutation should resolve the current Clerk identity, map it to the internal user record, and verify ownership before reading or changing records. Actions that call GitHub belong on the server so secrets and access tokens remain outside the mobile bundle.

## Core data model

A user owns projects. A project can contain features and checklist items. A project may be linked to one GitHub repository. GitHub connection records store encrypted credentials and connection state, while repository records store the bounded metadata needed for project health and progress views.

Project `state` describes lifecycle (`active`, `archived`, or `completed`). Project `health` describes delivery movement (`active`, `slowing`, `stalled`, or `dying`). Features remain DevTask-owned work items; GitHub issues and pull requests are activity signals rather than automatically created features.

## Data flow

1. Clerk authenticates the user and supplies a JWT to the Expo client.
2. The Convex provider sends authenticated requests to the deployment URL.
3. Convex resolves the internal user from the Clerk subject and checks ownership.
4. User actions update Convex records through typed queries and mutations.
5. GitHub OAuth is completed by a Convex action and callback endpoint. The token is encrypted before storage.
6. Repository sync fetches bounded GitHub metadata, applies health calculations, and records errors without exposing authorization headers or tokens.
7. The client subscribes to Convex queries and renders updated projects, features, progress, and settings.

## Reliability and security rules

External work must be idempotent and safe to retry. Scheduled synchronization should use rate-limit backoff and should not duplicate records. User-triggered sync should be throttled. Destructive account actions require fresh authentication and must revoke external access before data is purged.

Do not log tokens, authorization headers, OAuth codes, or complete GitHub API responses when they contain sensitive fields. Use separate Clerk, Convex, GitHub, and push-notification environments for development and production. Refer to [`BACKEND_SETUP.md`](BACKEND_SETUP.md) for configuration and [`DEVTASK_IMPLEMENTATION_BASELINE.md`](DEVTASK_IMPLEMENTATION_BASELINE.md) for the current delivery contract.

## Architectural boundaries

The web target is useful for development and review, but the product is designed as a mobile-first experience. Native OAuth redirect handling, push notifications, and device behavior require physical-device validation. Email notifications, paid plans, teams, AI features, and a standalone web release are intentionally outside the current v1 scope.
