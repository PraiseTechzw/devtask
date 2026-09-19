# DevTask backend setup

## 1. Link Clerk to Convex

In Clerk, enable the **Convex** integration for the same development instance used by the mobile app. This creates the `convex` JWT template expected by the client provider.

In the Convex dashboard for the development deployment, add:

```text
CLERK_JWT_ISSUER_DOMAIN=https://<your-actual-clerk-instance>.clerk.accounts.dev
```

Use the **Frontend API URL** from Clerk's API keys page. Replace the whole example value; do not paste `your-clerk-frontend-api` literally, and do not use the publishable key here.

## 2. Configure the mobile app

Add the deployment URL from Convex Dashboard → Settings → URL and deployment key to the local app environment:

```text
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

The app already expects `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; keep using the development key while developing.

## 3. Generate and deploy

Once the Convex environment variable is saved, run:

```bash
npx convex dev
```

This deploys `auth.config.ts`, the schema, and backend functions and regenerates `convex/_generated`. Keep the process running while you build client screens.

## 4. GitHub connection

Create a dedicated GitHub OAuth App. Its client secret belongs only in Convex environment variables; never add it to Expo `.env` or the device.

Required Convex environment variables for the implemented OAuth, repository picker, and sync flow:

```text
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_REDIRECT_URI=...
```

The redirect URI must point to a Convex HTTP action. GitHub OAuth needs the `repo` scope for private repositories, and `read:user` / `user:email` only if profile identification is needed.

After connection, DevTask stores normalized repository metadata and refreshes imported repository activity through the six-hour Convex cron. Project detail can request a manual refresh. Access failures remain visible as reconnect or missing-repository states instead of deleting the project.

Set `GITHUB_TOKEN_ENCRYPTION_KEY` to a base64-encoded 32-byte key in Convex. The key encrypts GitHub access tokens at rest and must never be included in the Expo client bundle.

## 5. Before production

Use separate Clerk, Convex, and GitHub OAuth App configurations for development and production. In Clerk, enable the social providers you show in the app (Google/GitHub) and test them in a development build rather than relying on Expo Go.
