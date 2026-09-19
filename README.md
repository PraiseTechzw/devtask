# DevTask

DevTask is a mobile-first project companion for developers. It helps a developer turn a repository into a focused delivery plan, track features and checklists, see project health, and stay aware of work that is slowing down. The app connects to GitHub for repository activity while keeping DevTask features and progress under the user’s control.

> **Project status:** DevTask is an active MVP under development. The repository contains the Expo client and Convex backend foundation. Some product capabilities described in the implementation baseline remain planned rather than complete.

## What the app does

DevTask currently provides the application shell for authentication, onboarding, projects, features, progress, settings, and GitHub connection flows. The intended MVP also includes repository import and sync, explainable health states, focus recommendations, reminders, notifications, and offline-safe feature updates. The source of truth for the product contract is [`docs/DEVTASK_IMPLEMENTATION_BASELINE.md`](docs/DEVTASK_IMPLEMENTATION_BASELINE.md).

The design references in [`design/`](design/) define the visual direction for the authentication flow, onboarding, project creation, empty states, and system-wide design language. The implemented design tokens and reusable primitives live in [`src/constants/theme.ts`](src/constants/theme.ts), [`src/global.css`](src/global.css), and [`src/components/`](src/components/).

## Technology

- **Expo 57** and **React Native 0.86** for iOS, Android, and web development.
- **Expo Router** for file-based navigation.
- **TypeScript** with strict compiler settings.
- **Clerk** for authentication and email verification.
- **Convex** for the typed backend, database schema, queries, mutations, and actions.
- **GitHub OAuth** for repository connection and activity synchronization.
- **Inter** and Expo UI packages for the visual system.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/app/` | Expo Router screens and route layouts |
| `src/components/` | Shared UI components and app shell |
| `src/constants/` | Theme values and mock data |
| `src/hooks/` | Theme and color-scheme hooks |
| `convex/` | Backend functions, schema, authentication config, and GitHub integration |
| `design/` | Product and visual design references |
| `docs/` | Setup, architecture, design, and implementation documentation |
| `assets/` | App icons, splash artwork, and screen references |
| `.github/` | Issue forms, pull request guidance, and CI configuration |

## Prerequisites

Install **Node.js 20 or newer**, npm, and a supported Expo development environment. For native device testing, install Android Studio and/or Xcode as appropriate for the target platform. You also need a Clerk application and a Convex deployment for authenticated backend development.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

   Fill in the Expo-visible Clerk and Convex values. Keep server-only GitHub credentials and the token encryption key in Convex environment variables; do not put them in the Expo client environment.

3. Configure the backend by following [`docs/BACKEND_SETUP.md`](docs/BACKEND_SETUP.md). The backend setup covers Clerk, Convex, GitHub OAuth, callback URLs, and environment separation.

4. Start the development server:

   ```bash
   npm run start
   ```

   Then choose a platform from the Expo CLI. Useful shortcuts are `npm run android`, `npm run ios`, and `npm run web`.

## Quality checks

Run the available checks before opening a pull request:

```bash
npm run lint
npx tsc --noEmit
```

The current package does not yet include a unit-test script. New business logic should be introduced with tests as the backend and synchronization features mature. See the quality gates in the implementation baseline and the contribution guide for the expected review standard.

## Documentation guide

- [`docs/BACKEND_SETUP.md`](docs/BACKEND_SETUP.md): service configuration and environment variables.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): client, backend, authentication, and GitHub data flow.
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md): visual tokens and UI guidance.
- [`docs/DEVTASK_IMPLEMENTATION_BASELINE.md`](docs/DEVTASK_IMPLEMENTATION_BASELINE.md): product scope, decisions, and delivery plan.
- [`design/README.md`](design/README.md): reference images and how they relate to the product.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): local workflow and pull request expectations.
- [`SECURITY.md`](SECURITY.md): responsible vulnerability reporting.
- [`SUPPORT.md`](SUPPORT.md): how to request help.

## License

DevTask is distributed under the [MIT License](LICENSE).

## Acknowledgements

DevTask is built on [Expo](https://expo.dev/), [React Native](https://reactnative.dev/), [Expo Router](https://docs.expo.dev/router/introduction/), [Clerk](https://clerk.com/), [Convex](https://www.convex.dev/), and the [GitHub REST API](https://docs.github.com/en/rest).
