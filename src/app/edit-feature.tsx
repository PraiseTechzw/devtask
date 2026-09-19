import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { Border, FontFamily, Palette, Radius, Spacing, Typography } from '@/constants/theme';

const weights = ['small', 'medium', 'large'] as const;
const buckets = ['v1', 'backlog'] as const;

type Weight = typeof weights[number];
type Bucket = typeof buckets[number];

export default function EditFeatureScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const feature = useQuery(api.features.get, id ? { featureId: id as never } : 'skip');
  const update = useMutation(api.features.update);
  const remove = useMutation(api.features.remove);
  const [title, setTitle] = useState<string>();
  const [weight, setWeight] = useState<Weight>();
  const [bucket, setBucket] = useState<Bucket>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (feature === undefined) return <ScreenMessage message="Loading feature…" />;
  if (!feature) return <ScreenMessage message="Feature not found." />;

  const currentTitle = title ?? feature.title;
  const currentWeight = weight ?? feature.weight;
  const currentBucket = bucket ?? feature.bucket;

  const save = async () => {
    const trimmedTitle = currentTitle.trim();
    if (!trimmedTitle) {
      setError('Enter a feature title.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await update({ featureId: feature._id, title: trimmedTitle, weight: currentWeight, bucket: currentBucket });
      router.back();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save feature.');
    } finally {
      setSaving(false);
    }
  };

  const deleteFeature = () => Alert.alert('Delete feature?', currentTitle, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        setDeleting(true);
        setError(null);
        try {
          await remove({ featureId: feature._id });
          router.back();
        } catch (caughtError) {
          setDeleting(false);
          setError(caughtError instanceof Error ? caughtError.message : 'Unable to delete feature.');
        }
      },
    },
  ]);

  return <View style={styles.screen}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} style={styles.backButton}><Text style={styles.back}>‹</Text></Pressable>
        <Text style={styles.title}>Edit Feature</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <Text style={styles.description}>Keep the next step small, clear, and finishable.</Text>
        <Text style={styles.label}>Feature title</Text>
        <TextInput accessibilityLabel="Feature title" onChangeText={setTitle} placeholder="e.g. Add sign-in validation" placeholderTextColor={Palette.steel} style={styles.input} value={currentTitle} />
        <Text style={styles.label}>Weight</Text>
        <View style={styles.options}>
          {weights.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: currentWeight === item }} key={item} onPress={() => setWeight(item)} style={[styles.option, currentWeight === item && styles.optionSelected]}><Text style={[styles.optionText, currentWeight === item && styles.optionTextSelected]}>{item}</Text><Text style={styles.optionMeta}>{item === 'small' ? '15 min' : item === 'medium' ? '30 min' : '60 min'}</Text></Pressable>)}
        </View>
        <Text style={styles.label}>Bucket</Text>
        <View style={styles.options}>
          {buckets.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: currentBucket === item }} key={item} onPress={() => setBucket(item)} style={[styles.option, currentBucket === item && styles.optionSelected]}><Text style={[styles.optionText, currentBucket === item && styles.optionTextSelected]}>{item === 'v1' ? 'v1 delivery' : 'Backlog'}</Text></Pressable>)}
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={saving || deleting} onPress={() => void save()} style={({ pressed }) => [styles.button, (saving || deleting) && styles.disabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save changes'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={saving || deleting} onPress={deleteFeature} style={({ pressed }) => [styles.delete, pressed && styles.pressed]}><Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete feature'}</Text></Pressable>
      </View>
    </SafeAreaView>
  </View>;
}

function ScreenMessage({ message }: { message: string }) {
  return <View style={styles.screen}><SafeAreaView style={styles.safe}><Text style={styles.loading}>{message}</Text></SafeAreaView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  safe: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  back: { color: Palette.white, fontFamily: FontFamily.regular, fontSize: 40, lineHeight: 40 },
  headerSpacer: { width: 40 },
  title: { ...Typography.h3, color: Palette.white },
  content: { paddingHorizontal: Spacing.five, paddingBottom: Spacing.seven },
  description: { ...Typography.body, color: Palette.muted },
  label: { ...Typography.small, marginTop: Spacing.five, marginBottom: Spacing.two, color: Palette.white },
  input: { minHeight: 52, paddingHorizontal: Spacing.three, borderRadius: Radius.small, borderWidth: Border.default, borderColor: '#006DD1', color: Palette.white, ...Typography.caption, backgroundColor: Palette.surface },
  options: { flexDirection: 'row', gap: Spacing.two },
  option: { flex: 1, minHeight: 54, padding: Spacing.two, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small, borderWidth: Border.default, borderColor: Palette.border, backgroundColor: Palette.surface },
  optionSelected: { borderColor: Palette.cyan, backgroundColor: '#073B7B' },
  optionText: { ...Typography.small, color: Palette.muted, textTransform: 'capitalize' },
  optionTextSelected: { color: Palette.white, fontFamily: FontFamily.semibold },
  optionMeta: { ...Typography.metric, marginTop: Spacing.one, color: Palette.steel },
  error: { ...Typography.caption, marginTop: Spacing.three, color: '#FF9DA5' },
  button: { minHeight: 54, marginTop: Spacing.six, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Palette.blue },
  buttonText: { ...Typography.body, color: Palette.white, fontFamily: FontFamily.semibold },
  delete: { alignItems: 'center', paddingVertical: Spacing.four },
  deleteText: { ...Typography.caption, color: '#FF929D', fontFamily: FontFamily.medium },
  loading: { ...Typography.body, margin: Spacing.five, color: Palette.muted },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
});
