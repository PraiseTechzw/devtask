import { Image } from 'expo-image';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: safeAreaInsets.top, paddingBottom: safeAreaInsets.bottom + BottomTabInset },
      ]}>
      <ThemedView style={styles.container}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
        <ThemedText type="subtitle">DevTask</ThemedText>
        <ThemedText style={styles.copy} themeColor="textSecondary">
          Build less. Finish more.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { flexGrow: 1 },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  logo: { width: 128, height: 128 },
  copy: { textAlign: 'center' },
});
