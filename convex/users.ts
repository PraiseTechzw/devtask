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
    return await ctx.db.insert('users', { clerkId: identity.subject, timeZone: args.timeZone, onboardingStatus: 'notStarted', theme: 'dark', createdAt: now, updatedAt: now });
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
  args: { reminderTime: v.optional(v.string()), theme: v.optional(v.union(v.literal('dark'), v.literal('light'))) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) throw new Error('Create your profile first');
    await ctx.db.patch(user._id, { ...args, updatedAt: Date.now() });
  },
});
