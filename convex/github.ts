import { v } from 'convex/values';

import { action, internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireCurrentUser } from './users';
import type { Id } from './_generated/dataModel';

const appRedirectUri = 'devtask://github-connected';
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

async function encryptToken(token: string) {
  const encodedKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error('GitHub token encryption is not configured');
  const rawKey = Uint8Array.from(atob(encodedKey.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
  if (rawKey.byteLength !== 32) throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
  return `${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
}

export const start = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const user = await ctx.runQuery(internal.users.getByClerkId, { clerkId: identity.subject });
    if (!user) throw new Error('Finish creating your DevTask profile first');
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;
    if (!clientId || !redirectUri) throw new Error('GitHub OAuth is not configured');
    const state = base64(crypto.getRandomValues(new Uint8Array(24))).replace(/[+/=]/g, '');
    await ctx.runMutation(internal.github.createState, { ownerId: user._id, value: state });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId); url.searchParams.set('redirect_uri', redirectUri); url.searchParams.set('scope', 'repo read:user user:email'); url.searchParams.set('state', state);
    return url.toString();
  },
});

export const createState = internalMutation({ args: { ownerId: v.id('users'), value: v.string() }, handler: async (ctx, args) => { await ctx.db.insert('githubOAuthStates', { ...args, expiresAt: Date.now() + 10 * 60 * 1000 }); } });
export const consumeState = internalMutation({ args: { value: v.string() }, handler: async (ctx, args) => { const state = await ctx.db.query('githubOAuthStates').withIndex('by_value', (q) => q.eq('value', args.value)).unique(); if (!state || state.expiresAt < Date.now()) return null; await ctx.db.delete(state._id); return state.ownerId; } });

export const finish = internalAction({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await ctx.runMutation(internal.github.consumeState, { value: args.state });
    if (!ownerId) throw new Error('GitHub authorization expired. Please try again.');
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID; const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET; const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) throw new Error('GitHub OAuth is not configured');
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: args.code, redirect_uri: redirectUri }).toString() });
    const tokenData = await tokenResponse.json() as { access_token?: string; scope?: string; error_description?: string };
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error_description || 'GitHub did not return an access token');
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${tokenData.access_token}`, 'X-GitHub-Api-Version': '2022-11-28' };
    const [userResponse, reposResponse] = await Promise.all([fetch('https://api.github.com/user', { headers }), fetch('https://api.github.com/user/repos?per_page=100&sort=updated', { headers })]);
    if (!userResponse.ok || !reposResponse.ok) throw new Error('Unable to load GitHub repositories');
    const githubUser = await userResponse.json() as { id: number };
    const repos = await reposResponse.json() as Array<{ id: number; full_name: string; html_url: string; default_branch: string; private: boolean }>;
    await ctx.runMutation(internal.github.saveConnection, { ownerId, githubUserId: String(githubUser.id), encryptedToken: await encryptToken(tokenData.access_token), scopes: (tokenData.scope || '').split(',').map((scope) => scope.trim()).filter(Boolean), repositories: repos.map((repo) => ({ githubRepositoryId: String(repo.id), fullName: repo.full_name, url: repo.html_url, defaultBranch: repo.default_branch || 'main', visibility: repo.private ? 'private' as const : 'public' as const })) });
  },
});

export const saveConnection = internalMutation({ args: { ownerId: v.id('users'), githubUserId: v.string(), encryptedToken: v.string(), scopes: v.array(v.string()), repositories: v.array(v.object({ githubRepositoryId: v.string(), fullName: v.string(), url: v.string(), defaultBranch: v.string(), visibility: v.union(v.literal('public'), v.literal('private')) })) }, handler: async (ctx, args) => { const now = Date.now(); const current = await ctx.db.query('githubConnections').withIndex('by_owner', (q) => q.eq('ownerId', args.ownerId)).unique(); const connection = { ownerId: args.ownerId, githubUserId: args.githubUserId, encryptedToken: args.encryptedToken, scopes: args.scopes, state: 'connected' as const, lastSyncAt: now, lastError: undefined, updatedAt: now }; if (current) await ctx.db.patch(current._id, connection); else await ctx.db.insert('githubConnections', { ...connection, createdAt: now }); const previous = await ctx.db.query('repositories').withIndex('by_owner', (q) => q.eq('ownerId', args.ownerId)).collect(); await Promise.all(previous.map((repo) => ctx.db.delete(repo._id))); await Promise.all(args.repositories.map((repo) => ctx.db.insert('repositories', { ownerId: args.ownerId, ...repo, updatedAt: now }))); } });

export const listRepositories = query({ args: {}, handler: async (ctx) => { const { user } = await requireCurrentUser(ctx); if (!user) return []; return await ctx.db.query('repositories').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect(); } });
export const getConnection = query({ args: {}, handler: async (ctx) => { const { user } = await requireCurrentUser(ctx); if (!user) return null; const connection = await ctx.db.query('githubConnections').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).unique(); return connection ? { state: connection.state, lastSyncAt: connection.lastSyncAt } : null; } });
export const callbackRedirect = appRedirectUri;


async function decryptToken(payload: string) {
  const encodedKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error('GitHub token encryption is not configured');
  const rawKey = Uint8Array.from(atob(encodedKey.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
  const [ivEncoded, dataEncoded] = payload.split('.');
  if (rawKey.byteLength !== 32 || !ivEncoded || !dataEncoded) throw new Error('Invalid encrypted GitHub token');
  const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(ivEncoded) }, key, decode(dataEncoded));
  return new TextDecoder().decode(plain);
}

export const getSyncTarget = internalQuery({
  args: { repositoryId: v.id('repositories') },
  handler: async (ctx, args) => {
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository) return null;
    const connection = await ctx.db.query('githubConnections').withIndex('by_owner', (q) => q.eq('ownerId', repository.ownerId)).unique();
    return repository && connection ? { repository, encryptedToken: connection.encryptedToken, connectionId: connection._id } : null;
  },
});

export const saveSyncResult = internalMutation({
  args: {
    repositoryId: v.id('repositories'),
    connectionId: v.id('githubConnections'),
    latestCommitAt: v.optional(v.number()),
    recentCommitCount: v.number(),
    openIssueCount: v.number(),
    openPullRequestCount: v.number(),
    error: v.optional(v.string()),
    availability: v.union(v.literal('available'), v.literal('missing'), v.literal('reauthorizationRequired')),
    rateLimitResetAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository) return;
    if (args.error) {
      await ctx.db.patch(args.repositoryId, { syncError: args.error, availability: args.availability, rateLimitResetAt: args.rateLimitResetAt, updatedAt: now });
      await ctx.db.patch(args.connectionId, { lastError: args.error, rateLimitResetAt: args.rateLimitResetAt, updatedAt: now });
      return;
    }
    await ctx.db.patch(args.repositoryId, { latestCommitAt: args.latestCommitAt, recentCommitCount: args.recentCommitCount, openIssueCount: args.openIssueCount, openPullRequestCount: args.openPullRequestCount, availability: 'available', syncError: undefined, rateLimitResetAt: undefined, lastSyncAt: now, updatedAt: now });
    await ctx.db.patch(args.connectionId, { lastSyncAt: now, lastError: undefined, rateLimitResetAt: undefined, updatedAt: now });
    await ctx.db.insert('activitySnapshots', { ownerId: repository.ownerId, repositoryId: repository._id, sampledDate: new Date(now).toISOString().slice(0, 10), latestCommitAt: args.latestCommitAt, recentCommitCount: args.recentCommitCount, openIssueCount: args.openIssueCount, openPullRequestCount: args.openPullRequestCount, createdAt: now });
  },
});

export const recordRetryableFailure = internalMutation({
  args: {
    repositoryId: v.id('repositories'),
    connectionId: v.id('githubConnections'),
    error: v.string(),
    rateLimitResetAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository) return null;
    const previous = await ctx.db.query('syncJobs').withIndex('by_repository', (q) => q.eq('repositoryId', args.repositoryId)).collect();
    const attemptCount = Math.max(0, ...previous.map((job) => job.attemptCount)) + 1;
    const delays = [60_000, 300_000, 900_000, 3_600_000];
    if (attemptCount > delays.length) {
      await ctx.db.patch(args.repositoryId, { syncError: args.error, availability: repository.availability || 'available', rateLimitResetAt: args.rateLimitResetAt, updatedAt: Date.now() });
      await ctx.db.patch(args.connectionId, { lastError: args.error, rateLimitResetAt: args.rateLimitResetAt, updatedAt: Date.now() });
      return null;
    }
    const delay = Math.max(delays[attemptCount - 1], args.rateLimitResetAt ? Math.max(0, args.rateLimitResetAt - Date.now()) : 0);
    const now = Date.now();
    const nextRetryAt = now + delay;
    await ctx.db.patch(args.repositoryId, { syncError: args.error, availability: repository.availability || 'available', rateLimitResetAt: args.rateLimitResetAt, updatedAt: now });
    await ctx.db.patch(args.connectionId, { lastError: args.error, rateLimitResetAt: args.rateLimitResetAt, updatedAt: now });
    await ctx.db.insert('syncJobs', { ownerId: repository.ownerId, repositoryId: repository._id, trigger: 'retry', idempotencyKey: `${repository._id}:${nextRetryAt}`, state: 'queued', attemptCount, nextRetryAt, error: args.error });
    return { delay, attemptCount };
  },
});

export const runSyncRepository = internalAction({
  args: { repositoryId: v.id('repositories') },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(internal.github.getSyncTarget, { repositoryId: args.repositoryId });
    if (!target) throw new Error('Repository connection not found');
    const token = await decryptToken(target.encryptedToken);
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' };
    const base = `https://api.github.com/repos/${target.repository.fullName}`;
    const [commitsResponse, issuesResponse] = await Promise.all([fetch(`${base}/commits?per_page=30`, { headers }), fetch(`${base}/issues?state=open&per_page=100`, { headers })]);
    const resetHeader = commitsResponse.headers.get('x-ratelimit-reset');
    const rateLimitResetAt = resetHeader ? Number(resetHeader) * 1000 : undefined;
    if (commitsResponse.status === 401 || commitsResponse.status === 403 || issuesResponse.status === 401 || issuesResponse.status === 403) {
      await ctx.runMutation(internal.github.saveSyncResult, { repositoryId: args.repositoryId, connectionId: target.connectionId, recentCommitCount: 0, openIssueCount: 0, openPullRequestCount: 0, availability: 'reauthorizationRequired', error: 'GitHub authorization needs to be renewed.', rateLimitResetAt });
      return { status: 'reauthorizationRequired' as const };
    }
    if (commitsResponse.status === 404 || issuesResponse.status === 404) {
      await ctx.runMutation(internal.github.saveSyncResult, { repositoryId: args.repositoryId, connectionId: target.connectionId, recentCommitCount: 0, openIssueCount: 0, openPullRequestCount: 0, availability: 'missing', error: 'Repository is no longer available to this connection.', rateLimitResetAt });
      return { status: 'missing' as const };
    }
    if (!commitsResponse.ok || !issuesResponse.ok) {
      const retry = await ctx.runMutation(internal.github.recordRetryableFailure, { repositoryId: args.repositoryId, connectionId: target.connectionId, error: 'GitHub sync failed. Previous activity data was kept.', rateLimitResetAt });
      if (retry) await ctx.scheduler.runAfter(retry.delay, internal.github.runSyncRepository, { repositoryId: args.repositoryId });
      return { status: 'failed' as const };
    }
    const commits = await commitsResponse.json() as Array<{ commit?: { author?: { date?: string } } }>;
    const issues = await issuesResponse.json() as Array<{ pull_request?: unknown }>;
    const latestCommitAt = commits[0]?.commit?.author?.date ? new Date(commits[0].commit.author.date).getTime() : undefined;
    await ctx.runMutation(internal.github.saveSyncResult, { repositoryId: args.repositoryId, connectionId: target.connectionId, latestCommitAt, recentCommitCount: commits.length, openIssueCount: issues.filter((item) => !item.pull_request).length, openPullRequestCount: issues.filter((item) => Boolean(item.pull_request)).length, availability: 'available' });
    return { status: 'completed' as const };
  },
});

export const syncRepository = action({
  args: { repositoryId: v.id('repositories') },
  handler: async (ctx, args): Promise<unknown> => ctx.runAction(internal.github.runSyncRepository, args),
});

export const listSyncTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const repositories = await ctx.db.query('repositories').collect();
    return repositories.filter((repository) => repository.availability !== 'missing').map((repository) => repository._id);
  },
});

export const syncAll = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    const repositories: Array<Id<'repositories'>> = await ctx.runQuery(internal.github.listSyncTargets, {});
    for (const repositoryId of repositories) await ctx.runAction(internal.github.runSyncRepository, { repositoryId });
    return repositories.length;
  },
});

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return;
    const connection = await ctx.db.query('githubConnections').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).unique();
    if (connection) await ctx.db.patch(connection._id, { encryptedToken: '', state: 'disconnected', scopes: [], updatedAt: Date.now() });
    const projects = await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    await Promise.all(projects.map((project) => ctx.db.patch(project._id, { repositoryId: undefined, repositoryName: undefined, repositoryUrl: undefined, updatedAt: Date.now() })));
    const repositories = await ctx.db.query('repositories').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    await Promise.all(repositories.map((repository) => ctx.db.delete(repository._id)));
  },
});
