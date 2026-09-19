# DevTask — Implementation Baseline

## 1. Product contract

DevTask is a native iOS and Android app that helps a solo or indie developer finish one project before beginning another. The daily success loop is: open the app, see a single recommended focus project and its smallest incomplete feature, complete it, and visibly move the project toward release.

The v1 primary user owns every project personally. Freelancers may use it for their own work, but organizations, collaboration, client access, shared ownership, client reporting, billing, social/accountability features, AI planning, GitLab, and Bitbucket are out of scope.

### Non-negotiable MVP

- Clerk sign-up/sign-in, first-run setup, and returning-user routing.
- GitHub OAuth with selected private-repository access; repository selection and activity sync.
- Create, edit, archive, complete, and list projects; exactly one user-selected focus project.
- Manual feature management: create, edit, delete, complete, weight as small/medium/large, and assign to v1 or backlog.
- Progress, basic explainable health, an 80% finish-line prompt, Today’s Focus, daily checklist, project statistics, and notifications.

### UX and visual baseline

`design/full-system-design-ref.png` is the primary reference. `design/splash-to-yourset-ref.png`, `design/add-project-to-emptystates-ref.png`, and `design/design-system-ref.png` are supporting references. Preserve their mobile navigation and the dark charcoal / soft-white / electric-blue / cyan system, rounded cards, hairline borders, restrained glow, Inter/SF-style UI typography, and monospace metrics. The experience must stay calm, motivating, focused, and free of dense Jira-style controls.

Do not retain the reference image’s Personal Access Token field: its visual placement becomes a **Connect GitHub** OAuth action. OAuth is the security contract.

## 2. Architecture and integrations

### Client

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript, and Expo Router. Retain the existing app’s `src/app` route root.
- Use development builds for production-equivalent authentication and remote-notification testing. Expo SDK 57’s remote notification flow requires a development build; Expo Go is suitable only for limited local-notification work.
- Native only in v1. Do not make web acceptance a release requirement.
- Use Clerk’s Expo SDK with native authentication UI or hosted auth; choose native UI only after verifying the installed Clerk SDK supports the required production flow. Store Clerk session material through the SDK’s SecureStore integration, never AsyncStorage.
- Use `expo-notifications` for local schedules, permission prompts, Expo push tokens, notification response handling, and deep links to the focus/project screen.

### Backend

- Convex is the application system of record. Use its schema validation, authenticated queries/mutations, actions for external GitHub calls, and scheduled functions for reconciliation, health recalculation, notification dispatch, and retry scheduling.
- Authenticate Convex calls with Clerk JWTs. Every query/mutation/action derives the owner from the validated Clerk identity; client-supplied owner identifiers are never trusted.
- GitHub is authoritative only for external repository/activity facts; DevTask is authoritative for projects, features, focus, progress, health history, preferences, and notifications.

### GitHub

- Use a dedicated GitHub OAuth App, not a Personal Access Token and not a Clerk social-login token. The OAuth flow requests `repo` access for private repositories and `read:user` / `user:email` only if needed to identify the connected account. Keep the client secret and token exchange server-side.
- Store OAuth access tokens encrypted at rest in Convex; never return, log, or expose them to the client. Revoke/delete them on disconnect or account deletion.
- The account picker lists repositories available to the token. A repository may only be linked once per owner; the canonical GitHub repository ID, not URL/name, enforces uniqueness.
- On first connection and manual refresh, fetch repository ID/name/full name/html URL/default branch/visibility, latest commit timestamp, a bounded recent commit window, open-issue count, open-PR count, and availability. Sync only imported repositories.
- Schedule normal sync every 6 hours, allow one manual refresh per repository every 5 minutes, and coalesce overlapping syncs. A manual refresh starts an immediate job and shows last-successful data plus an updating state.
- Respect GitHub rate-limit headers. Pause at `x-ratelimit-reset` or `retry-after`; retry transient 5xx/network errors with exponential backoff (1, 5, 15, 60 minutes; max four retries). Persist failure reason and next retry. A rate-limited/failed sync never overwrites prior successful activity.
- Treat 404/410 as `missing`; treat 401/403 authentication failures as `reauthorizationRequired`; retain the project and show a reconnect/relink state. Repository rename updates its display fields using the stable GitHub ID. A repository becoming inaccessible is not deleted automatically.

### Deployment and observability

- Use EAS Build and EAS Submit for iOS/Android release builds; use EAS Update only for compatible JavaScript/asset updates. Maintain development, preview, and production EAS profiles.
- Use separate Clerk development/production instances, separate Convex deployments, separate GitHub OAuth apps/callback URLs, and separate push credentials/projects per environment.
- Add Sentry for client and Convex error reporting, and privacy-safe product analytics for onboarding completion, GitHub connect outcome, first-project creation, first-feature completion, focus acceptance, project completion, and notification-open events. Never send OAuth tokens, repository source, commit messages, or user email to analytics/logs.

## 3. Data model and business rules

All timestamps are UTC; a user profile stores an IANA time zone for daily-boundary and reminder calculation. Soft-delete user-generated objects for 30 days, then purge through a scheduled task. GitHub raw payloads are not retained; retain normalized aggregates only.

| Entity | Required fields and rules |
|---|---|
| `users` | Clerk `userId` (unique), timeZone, onboarding status, created/updated timestamps. |
| `githubConnections` | owner, GitHub user ID (unique per owner), encrypted token, scopes, connection state, last sync/error/rate-limit reset. One active connection per user. |
| `repositories` | owner, GitHub repository ID (unique with owner), connection, full name, URL, default branch, visibility, availability, latest activity aggregates. |
| `projects` | owner, name (1–80 chars), optional repository, optional deadline, state (`active`, `archived`, `completed`), focus flag, completed/archived timestamps, health state/reasons/score, last activity. At most one active focused project per owner. |
| `features` | owner/project, title (1–120 chars), bucket (`v1`, `backlog`), weight (`small=1`, `medium=2`, `large=3`), state (`open`, `completed`), order, completed timestamp. Features are manually authored and belong to exactly one non-deleted project. |
| `checklistItems` | owner, optional project/feature link, title, local-date key, state, order. Daily checklist is separate from feature completion. |
| `activitySnapshots` | repository/project, sampled date, last commit timestamp, commit count for rolling window, open issues/PRs, sync run reference. |
| `healthEvents` | project, previous/current health, score, reason codes, evaluated timestamp. Append only on a status/reason change. |
| `notifications` / `devices` | owner, type, payload/deep link, delivery/read timestamps; device Expo token (unique), platform, permission state. |
| `syncJobs` | repository, trigger, idempotency key, state, attempt count, started/completed/next retry, sanitized error. One non-terminal job per repository. |

### Progress

Project progress is `completed weight / total v1-feature weight × 100`, rounded to the nearest whole percentage. Backlog features do not affect progress. A project with no v1 features has `0%` and the “Define your features to unlock progress” state. Completing a project requires an explicit confirmation; it does not happen automatically at 100%, because shipping is a user decision. The 80% prompt appears once per project when progress first reaches 80% or higher and offers final checklist templates: testing, polish, documentation, release.

### Health: explicit hybrid default

Compute once after every relevant feature/project mutation and each completed sync. Store the result and human-readable reasons.

- Start at 100.
- Deduct 5/15/35/55 for 8–14 / 15–30 / 31–60 / more than 60 days since last meaningful activity (latest GitHub commit or completed feature).
- Deduct 10 if no feature was completed in 14 days; deduct 10 if open issues exceed completed v1 features; deduct 10 if an optional deadline is within 14 days and progress is below 80%.
- Add 10 when a feature was completed in the last 7 days; clamp to 0–100.
- `Active`: ≥75 and activity ≤7 days; `Slowing`: score 50–74 or activity 8–14 days; `Stalled`: score 25–49 or activity 15–30 days; `Dying`: score <25 or activity >30 days; `Completed` follows project state.

Health never claims GitHub activity that has not synced. If data is stale beyond 24 hours, label the status “based on last sync” and prompt refresh/reconnect rather than silently recalculating external facts.

### Focus recommendation

The user chooses the one focus project; DevTask never changes it automatically. The Home recommendation defaults to the chosen active project. If none is chosen, recommend the active project with the highest urgency: a Dying/Stalled state first, then closest deadline, then lowest progress, then most recent creation as final tie-breaker. The smallest next step is the lowest-order incomplete v1 feature, preferring `small`, then `medium`, then `large`; show 15/30/60 minute estimates respectively. A user may change focus from Home or Projects.

## 4. User journeys and interface contract

1. **Launch and auth:** splash → Clerk sign-in/sign-up. A signed-in user with incomplete setup returns to its next onboarding step; a completed user opens Home.
2. **Onboarding:** product promise → GitHub OAuth → notification preference/time → create first project (name, optional GitHub repository, optional deadline) → “You’re set” → Home. Skipping GitHub is allowed, but Home clearly marks activity as unconnected and offers reconnect; imported repository is optional per project.
3. **Home:** Today’s Focus card, next feature/time estimate, active/dying/finished statistics, project cards, daily checklist, motivating copy, add-project action. Provide no-project, all-completed, offline, stale-sync, and permission-denied states from the visual reference.
4. **Projects:** searchable, filterable list (`all`, `active`, `slowing`, `stalled`, `dying`, `completed`), with status sorting when filter is all. Project detail shows progress, feature buckets, health reasons, GitHub activity, and archive/complete/edit actions.
5. **Feature completion:** optimistic local UI update; Convex mutation validates ownership and recomputes progress/health. On failure, revert with an actionable retry message. At 80%, show the finish-line prompt exactly once.
6. **Sync and recovery:** show current cached data, last sync time, and job progress. Failures show retry/reconnect without blocking feature work. Offline mode permits queued feature/checklist mutations only; GitHub refresh is disabled until online. On reconnect, replay mutations in creation order; server `updatedAt` wins for same-field edits and conflicts are surfaced only if local unsynced edit loses.
7. **Notifications:** request system permission only after onboarding explains its value. Schedule one local daily nudge at the selected local time. Use server-sent Expo push for Dying/Stalled/revival and 80% events, deduplicated per project/type/day. Also create an in-app notification record. Email is deliberately deferred despite the prior “all” response: it requires an unselected provider, deliverability policy, and consent design; do not block the core mobile MVP on it.

## 5. API, jobs, security, and delivery plan

### Convex interfaces

- Queries: current user/setup, Home aggregate, paginated/filterable projects, project detail/features/activity, repositories picker, analytics aggregate, settings, notifications.
- Mutations: complete onboarding, create/edit/archive/complete project, set focus, create/edit/delete/complete/reorder feature, manage checklist, save reminder/theme preferences, mark notification read, disconnect GitHub, request export/delete account.
- Actions: begin/complete GitHub OAuth exchange, list repositories, enqueue/run repository sync, send Expo push, produce data export, revoke external access.
- Scheduled functions: six-hour repository sync sweep, due retry runner, daily health/reminder evaluation by timezone, account purge, and notification dispatch. Every external action uses an idempotency key; scheduled work is safe to rerun.

### Security and privacy

- Verify Clerk identity and owner access in every Convex function. No organization roles in v1.
- Keep OAuth client secret and GitHub access tokens in Convex environment variables/encrypted server storage only. Redact authorization headers and token-shaped values from errors.
- Encrypt in transit, minimize retained GitHub data, and provide settings actions for export, clear app data, disconnect GitHub, and account deletion. Deletion revokes GitHub access, invalidates device tokens, soft-deletes owned records, and schedules permanent purge after 30 days.
- Rate-limit user-triggered sync, OAuth callbacks, notification token registration, and account-destructive actions. Require fresh Clerk reverification for clear-data/account deletion.

### Quality bar and release gates

- Unit-test progress, health thresholds, focus selection, validation, time-zone reminder calculation, and deduplication.
- Test authenticated Convex ownership boundaries, idempotent sync jobs, retry/rate-limit handling, repository availability changes, OAuth disconnect, and deletion/export paths.
- E2E test iOS and Android: sign-up/returning route, GitHub connect/import, first project/feature, feature completion + 80% prompt, focus change, sync errors, push deep link, and offline feature completion.
- Test keyboard/accessibility labels, dynamic text, contrast, screen-reader order, empty/loading/error states, and narrow/large phone layouts.
- Release only after physical-device testing of OAuth and push notifications, Crash-free/failed-sync analytics are monitored, and the app passes `expo-doctor`, type checks, linting, and release build validation.

### Delivery sequence

1. Establish Expo/Clerk/Convex environment separation, routing shell, design tokens, and authentication boundary.
2. Implement onboarding plus dedicated GitHub OAuth App connection and repository import/sync foundation.
3. Implement projects, features, focus, progress, and Home using the supplied designs.
4. Add health events, activity views, filters, analytics, empty/error/offline states.
5. Add notifications, settings/data controls, observability, automated tests, EAS preview/production release pipeline.

## 6. Explicit decisions and deferred work

### Defaults locked because the interview ended early

- Explainable hybrid health model as defined above.
- Manual DevTask features; issues/PRs are health signals, not features.
- Recommendation suggests; user confirms/changes focus.
- In-app, local daily, and server push notifications are v1. Email is deferred until a provider/consent policy is chosen.
- Six-hour automatic GitHub sync, five-minute manual refresh cooldown, normal REST API usage with rate-limit backoff.
- English only, device locale formatting, and user-selected IANA time zone. No offline GitHub data access beyond cache.
- No paid plans, teams, web release, AI, or social features in v1.

### Items requiring product approval before implementation changes them

- The health formula and notifications scope above are the initial implementation contract; modify them only with an explicit product decision.
- GitHub OAuth scope may need adjustment after a real GitHub App/OAuth App capability review. Do not fall back to PATs.
- Email remains excluded until the sender/provider, consent copy, unsubscribe behavior, and cost owner are specified.
