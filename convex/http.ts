import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();
http.route({ path: '/github/callback', method: 'GET', handler: httpAction(async (ctx, request) => { const url = new URL(request.url); const error = url.searchParams.get('error'); const code = url.searchParams.get('code'); const state = url.searchParams.get('state'); if (error || !code || !state) return Response.redirect(`devtask://github-connected?status=error&message=${encodeURIComponent(error || 'Authorization was cancelled')}`, 302); try { await ctx.runAction(internal.github.finish, { code, state }); return Response.redirect('devtask://github-connected?status=success', 302); } catch { return Response.redirect('devtask://github-connected?status=error&message=Unable%20to%20connect%20GitHub', 302); } }) });
export default http;
