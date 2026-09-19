import { v } from 'convex/values';

import { action, internalAction, internalMutation, internalQuery, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireCurrentUser } from './users';

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
