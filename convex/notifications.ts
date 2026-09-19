import { v } from 'convex/values';

import { internalAction, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
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


export const registerDevice = mutation({
  args: { expoPushToken: v.string(), platform: v.union(v.literal('ios'), v.literal('android'), v.literal('web')), permissionState: v.union(v.literal('granted'), v.literal('denied'), v.literal('undetermined')) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user || !args.expoPushToken.startsWith('ExponentPushToken[')) throw new Error('Invalid Expo push token');
    const existing = await ctx.db.query('devices').withIndex('by_token', (q) => q.eq('expoPushToken', args.expoPushToken)).unique();
    const values = { ownerId: user._id, expoPushToken: args.expoPushToken, platform: args.platform, permissionState: args.permissionState, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, values); else await ctx.db.insert('devices', values);
  },
});

export const unregisterDevice = mutation({
  args: { expoPushToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const device = await ctx.db.query('devices').withIndex('by_token', (q) => q.eq('expoPushToken', args.expoPushToken)).unique();
    if (user && device?.ownerId === user._id) await ctx.db.delete(device._id);
  },
});

export const sendPush = internalAction({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const notification = await ctx.runQuery(internal.notifications.getForDelivery, { notificationId: args.notificationId });
    if (!notification || !notification.devices.length) return;
    const messages = (notification.devices as Array<{ expoPushToken: string }>).map((device) => ({ to: device.expoPushToken, title: notification.notification.title, body: notification.notification.body, data: { url: notification.notification.deepLink } }));
    const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
    if (!response.ok) throw new Error('Expo push delivery failed');
  },
});

export const getForDelivery = internalQuery({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return null;
    const devices = await ctx.db.query('devices').withIndex('by_owner', (q) => q.eq('ownerId', notification.ownerId)).collect();
    return { notification, devices: devices.filter((device) => device.permissionState === 'granted') };
  },
});
