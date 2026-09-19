# Contributing to DevTask

Thank you for helping improve DevTask. Contributions should keep the mobile experience focused, preserve the documented product decisions, and include the documentation or design updates needed to explain behavior changes.

## Before you start

Read the [README](README.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and [`docs/DEVTASK_IMPLEMENTATION_BASELINE.md`](docs/DEVTASK_IMPLEMENTATION_BASELINE.md). For UI work, also read [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) and [`design/README.md`](design/README.md).

For substantial changes, open an issue first so the scope and product behavior are clear. Small fixes and documentation improvements can proceed directly to a pull request.

## Development workflow

1. Create a focused branch from `master`.
2. Install dependencies with `npm install` and configure a local `.env` from `.env.example`.
3. Make the smallest coherent change. Reuse existing components and design tokens.
4. Update documentation when routes, environment variables, data models, backend behavior, or product decisions change.
5. Run `npm run lint` and `npx tsc --noEmit`.
6. Open a pull request using the repository template and describe validation steps, screenshots, migration concerns, and follow-up work.

Do not commit `.env`, credentials, OAuth codes, access tokens, generated native directories, or personal device artifacts. Do not alter the product health model or notification scope without an explicit product decision.

## Pull requests

A pull request should have one clear purpose and a descriptive title. UI changes should include screenshots or a short recording when useful. Backend changes should explain authentication and ownership checks. Changes that affect GitHub integration should describe token handling, retry behavior, rate limits, and failure states.

Reviewers will look for correctness, accessibility labels, loading and error states, responsive behavior, secure secret handling, and consistency with the design references. Keep generated files and unrelated formatting changes out of the pull request.

## Commit messages

Use concise imperative messages, such as `Add project empty state` or `Document Convex setup`. Keep commits easy to review and avoid committing temporary debugging changes.

## Reporting bugs and requesting features

Use the repository issue forms. A useful bug report includes the platform, app version or commit, reproduction steps, expected behavior, actual behavior, and relevant logs with secrets removed. A feature request should explain the user problem and how the proposed behavior fits the existing product scope.
