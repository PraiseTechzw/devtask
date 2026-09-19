import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';

export default function GitHubConnectedScreen() {
  const { isSignedIn } = useAuth();
  const profile = useQuery(api.users.getCurrent, isSignedIn ? {} : 'skip');

  if (!isSignedIn || profile === undefined) return null;
  return <Redirect href={profile?.onboardingStatus === 'complete' ? '/(app)/settings' : '/onboarding'} />;
}
