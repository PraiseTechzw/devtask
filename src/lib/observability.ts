type ProductEvent =
  | 'onboarding_completed'
  | 'github_connect_started'
  | 'github_connect_succeeded'
  | 'github_connect_failed'
  | 'first_project_created'
  | 'first_feature_completed'
  | 'focus_accepted'
  | 'project_completed'
  | 'notification_opened';

function enabled() {
  return process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true';
}

export function track(event: ProductEvent, properties: Record<string, string | number | boolean> = {}) {
  if (!enabled()) return;
  // Keep this provider-neutral until a production analytics vendor is selected.
  // Only event names and aggregate booleans/counts are accepted by this boundary.
  const safeProperties = Object.fromEntries(Object.entries(properties).filter(([key]) => /^(count|connected|completed|source)$/.test(key)));
  if (__DEV__) console.info(`[DevTask analytics] ${event}`, safeProperties);
}

export function reportError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (__DEV__) console.error(`[DevTask error] ${context}: ${message}`);
  // Sentry can be wired here once the production DSN and environment policy are configured.
}
