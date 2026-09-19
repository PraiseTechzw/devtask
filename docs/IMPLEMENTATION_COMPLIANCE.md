# DevTask implementation and design compliance

This matrix records the current state against `DEVTASK_IMPLEMENTATION_BASELINE.md`, `DESIGN_SYSTEM.md`, and the references in `design/`. It is intentionally explicit: externally dependent release work is not represented as complete merely because the application code has a placeholder.

| Area | Status | Evidence or remaining action |
| --- | --- | --- |
| Clerk authentication and returning-user routing | Complete | Auth routes, Clerk provider, SecureStore token cache, onboarding redirect, and authenticated route shell are present. |
| Onboarding flow | Complete | Welcome, GitHub connection step, notification preference/time, first project creation, and completion routing are implemented. |
| GitHub OAuth and repository picker | Complete | OAuth begins server-side, credentials remain in Convex, repository selection uses the stable GitHub repository ID, and PAT entry is not used. |
| GitHub activity sync | Partial | Normalized commit/issue/PR aggregates, stale-data preservation, missing-repository, and reauthorization states are present. Persisted retry scheduling, rate-limit backoff, and the complete six-hour reconciliation loop still require deployment verification and follow-up hardening. |
| Projects and focus | Complete | Create, edit, archive, complete, list, search/filter, explicit focus selection, and recommendation logic are implemented. |
| Feature management | Complete | Create, edit, delete, completion, weight, bucket assignment, progress recalculation, and a visible edit control are implemented. |
| Progress and health | Complete | Weighted v1 progress, explainable health state/reasons, health history, finish-line notification, and explicit ship confirmation are implemented. |
| Daily checklist | Complete | Home exposes add and toggle interactions backed by authenticated Convex mutations. Checklist remains separate from feature completion. |
| Notifications | Partial | In-app records, local daily reminders, response deep links, permission handling, and visible Expo setup errors are implemented. Remote delivery still needs development-build/APNs/FCM/EAS credentials. |
| Settings and data controls | Partial | Export, GitHub disconnect, clear-data, theme, notification preference, and sign-out flows are present. Account deletion, fresh reverification, soft-delete retention, and purge scheduling remain to be added. |
| Offline mutation queue | Not implemented | Feature/checklist mutations are not yet queued and replayed on reconnect. GitHub refresh correctly remains a network-only operation. |
| Observability and analytics | Not implemented | Sentry, privacy-safe product analytics, and release monitoring still require provider setup and instrumentation. |
| Automated and device testing | Not implemented | Unit, ownership, E2E, physical-device notification, and release-build validation remain release gates. |
| Design reference coverage | Complete for mapped product areas | Auth, welcome/onboarding, project/empty-state, design-system, and full-flow references are mapped in `design/README.md`; the canonical tokens live in `src/constants/theme.ts`. |
| Design-system usage | Improving / partial | Settings and feature editing use shared palette, typography, spacing, radius, and border tokens. Legacy screens still contain screen-local values and should be migrated incrementally without changing product behavior. |

## Explicit release boundary

The current branch is suitable for continued local development and review of the implemented native flows. It is **not yet a production release claim** until the partial and not-implemented rows are completed or formally deferred by product decision, and the physical-device/EAS release gates pass.
