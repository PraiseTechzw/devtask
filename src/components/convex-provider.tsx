import { useAuth } from '@clerk/expo';
import { type ReactNode } from 'react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function DevTaskConvexProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!convex) return <>{children}</>;
  return <ConvexProviderWithClerk client={convex} useAuth={() => auth}>{children}</ConvexProviderWithClerk>;
}
