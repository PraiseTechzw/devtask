import { v } from 'convex/values';

import { internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

export async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  const user = await ctx.db.query('users').withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject)).unique();
  return { identity, user };
}

export const getByClerkId = internalQuery({ args: { clerkId: v.string() }, handler: async (ctx, args) => await ctx.db.query('users').withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId)).unique() });

export const getCurrent = query({
  args: {},
  handler: async (ctx) => (await requireCurrentUser(ctx)).user,
});

export const ensureCurrent = mutation({
  args: { timeZone: v.string() },
  handler: async (ctx, args) => {
    const { identity, user } = await requireCurrentUser(ctx);
    if (user) return user._id;
    const now = Date.now();
    return await ctx.db.insert('users', { clerkId: identity.subject, timeZone: args.timeZone, onboardingStatus: 'notStarted', notificationsEnabled: true, theme: 'dark', createdAt: now, updatedAt: now });
  },
});

export const completeOnboarding = mutation({
  args: { reminderTime: v.string(), timeZone: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) throw new Error('Create your profile before completing onboarding');
    await ctx.db.patch(user._id, { onboardingStatus: 'complete', reminderTime: args.reminderTime, timeZone: args.timeZone, updatedAt: Date.now() });
  },
});

export const setPreferences = mutation({
  args: { reminderTime: v.optional(v.string()), notificationsEnabled: v.optional(v.boolean()), theme: v.optional(v.union(v.literal('dark'), v.literal('light'))) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) throw new Error('Create your profile first');
    await ctx.db.patch(user._id, { ...args, updatedAt: Date.now() });
  },
});

export const clearData = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return;
    const projects = await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const features = await Promise.all(projects.map((project) => ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', project._id)).collect()));
    const checklist = await ctx.db.query('checklistItems').withIndex('by_owner_and_date', (q) => q.eq('ownerId', user._id)).collect();
    const healthEvents = await ctx.db.query('healthEvents').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const notifications = await ctx.db.query('notifications').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const devices = await ctx.db.query('devices').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const repositories = await ctx.db.query('repositories').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const snapshots = (await Promise.all(repositories.map((repository) => ctx.db.query('activitySnapshots').withIndex('by_repository', (q) => q.eq('repositoryId', repository._id)).collect()))).flat();
    const syncJobs = (await Promise.all(repositories.map((repository) => ctx.db.query('syncJobs').withIndex('by_repository', (q) => q.eq('repositoryId', repository._id)).collect()))).flat();
    await Promise.all([...projects, ...features.flat(), ...checklist, ...healthEvents, ...notifications, ...devices, ...repositories, ...snapshots, ...syncJobs].map((record) => ctx.db.delete(record._id)));
    await ctx.db.patch(user._id, { onboardingStatus: 'inProgress', reminderTime: undefined, notificationsEnabled: false, updatedAt: Date.now() });
  },
});

export const exportSummary = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return null;
    const projects = await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const features = (await Promise.all(projects.map((project) => ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', project._id)).collect()))).flat();
    return { exportedAt: new Date().toISOString(), profile: { timeZone: user.timeZone, onboardingStatus: user.onboardingStatus, reminderTime: user.reminderTime }, projects, features };
  },
});
