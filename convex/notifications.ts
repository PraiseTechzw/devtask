import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireCurrentUser } from './users';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return [];
    return (await ctx.db.query('notifications').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect()).sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return 0;
    return (await ctx.db.query('notifications').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect()).filter((item) => !item.readAt).length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!user || !notification || notification.ownerId !== user._id) throw new Error('Notification not found');
    await ctx.db.patch(notification._id, { readAt: Date.now() });
  },
});

export const markAllRead = mutation({ args: {}, handler: async (ctx) => {
  const { user } = await requireCurrentUser(ctx);
  if (!user) return;
  const notifications = await ctx.db.query('notifications').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
  await Promise.all(notifications.filter((item) => !item.readAt).map((item) => ctx.db.patch(item._id, { readAt: Date.now() })));
} });
