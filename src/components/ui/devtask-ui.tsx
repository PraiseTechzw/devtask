import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { Border, FontFamily, Palette, Radius, Spacing, Typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function AppButton({ label, icon, variant = 'primary', onPress }: { label: string; icon?: ReactNode; variant?: ButtonVariant; onPress?: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, styles[variant], pressed && styles.pressed]}><Text style={[styles.buttonLabel, variant !== 'primary' && styles.buttonLabelOutline]}>{label}</Text>{icon}</Pressable>;
}

export function Surface({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function FormField({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor={Palette.steel} style={styles.input} {...props} /></View>;
}

export function ProgressBar({ value, color = Palette.cyan }: { value: number; color?: string }) {
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }} style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} /></View>;
}

export type Status = 'active' | 'slowing' | 'stalled' | 'dying' | 'completed';
const statusColor: Record<Status, string> = { active: Palette.green, slowing: Palette.amber, stalled: Palette.orange, dying: Palette.red, completed: Palette.cyan };
export function StatusBadge({ status }: { status: Status }) { return <View style={[styles.badge, { borderColor: statusColor[status] }]}><View style={[styles.badgeDot, { backgroundColor: statusColor[status] }]} /><Text style={[styles.badgeText, { color: statusColor[status] }]}>{status}</Text></View>; }

export function IconTile({ icon, label, active = false, onPress }: { icon: ReactNode; label?: string; active?: boolean; onPress?: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconTile, active && styles.iconTileActive, pressed && styles.pressed]}><View>{icon}</View>{label ? <Text style={styles.iconTileLabel}>{label}</Text> : null}</Pressable>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <Surface style={styles.empty}><View style={styles.emptyIcon}>{icon}</View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDescription}>{description}</Text>{action}</Surface>;
}

export function OnboardingPagination({ step, total = 4 }: { step: number; total?: number }) {
  return <View accessibilityLabel={`Onboarding step ${step} of ${total}`} style={styles.pagination}>{Array.from({ length: total }, (_, index) => <View key={index} style={[styles.dot, index + 1 === step && styles.dotActive]} />)}</View>;
}

const styles = StyleSheet.create({
  button: { height: 56, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.six },
  primary: { backgroundColor: Palette.electric, shadowColor: Palette.sky, shadowOpacity: 0.38, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  secondary: { borderWidth: Border.default, borderColor: Palette.sky, backgroundColor: 'transparent' }, ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }, buttonLabel: { color: '#FFFFFF', fontFamily: FontFamily.semibold, fontSize: 16 }, buttonLabelOutline: { color: Palette.cyan },
  surface: { borderRadius: Radius.medium, borderWidth: Border.default, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Spacing.four },
  field: { gap: Spacing.two }, fieldLabel: { ...Typography.small, color: Palette.white }, input: { height: 48, borderRadius: Radius.small, borderWidth: Border.default, borderColor: '#006DD1', backgroundColor: Palette.backgroundDeep, color: Palette.white, paddingHorizontal: Spacing.three, ...Typography.caption },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: Radius.pill, backgroundColor: '#153A69' }, progressFill: { height: '100%', borderRadius: Radius.pill },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: Border.hairline, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 4 }, badgeDot: { width: 6, height: 6, borderRadius: 3 }, badgeText: { ...Typography.small, textTransform: 'capitalize' },
  iconTile: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: Radius.small, borderWidth: Border.default, borderColor: '#006DD1', backgroundColor: Palette.backgroundDeep, padding: Spacing.two }, iconTileActive: { backgroundColor: '#073B7B' }, iconTileLabel: { ...Typography.small, color: Palette.white },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.seven }, emptyIcon: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30, backgroundColor: '#073B7B' }, emptyTitle: { ...Typography.h3, color: Palette.white }, emptyDescription: { ...Typography.caption, color: Palette.muted, textAlign: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 9 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3A5A8A' }, dotActive: { backgroundColor: Palette.sky },
});
