import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { Border, FontFamily, Palette, Radius, Spacing, Typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function AppButton({
  label,
  icon,
  variant = 'primary',
  disabled = false,
  onPress,
  style,
}: {
  label: string;
  icon?: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.buttonPressable, style, (pressed || disabled) && styles.buttonPressed]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={[Palette.blue, Palette.electric, Palette.cyan]}
          end={{ x: 1, y: 0.5 }}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0.5 }}
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>{label}</Text>
          {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
        </LinearGradient>
      ) : (
        <View style={[styles.button, variant === 'secondary' ? styles.secondaryButton : styles.ghostButton]}>
          <Text style={[styles.buttonLabel, variant === 'ghost' && styles.ghostButtonLabel]}>{label}</Text>
          {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
        </View>
      )}
    </Pressable>
  );
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

export function OnboardingPagination({ step, total = 3 }: { step: number; total?: number }) {
  return <View accessibilityLabel={`Onboarding step ${step} of ${total}`} style={styles.pagination}>{Array.from({ length: total }, (_, index) => <View key={index} style={[styles.dot, index + 1 === step && styles.dotActive]} />)}</View>;
}

export function SegmentedControl<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange?: (value: T) => void }) {
  return <View style={styles.segmented}>{options.map((option) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: option === value }} key={option} onPress={() => onChange?.(option)} style={[styles.segment, option === value && styles.segmentSelected]}><Text style={[styles.segmentLabel, option === value && styles.segmentLabelSelected]}>{option}</Text></Pressable>)}</View>;
}

export function Toggle({ value, label, description, onChange }: { value: boolean; label: string; description?: string; onChange?: (value: boolean) => void }) {
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange?.(!value)} style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.toggleLabel}>{label}</Text>{description ? <Text style={styles.toggleDescription}>{description}</Text> : null}</View><View style={[styles.switchTrack, value && styles.switchTrackOn]}><View style={[styles.switchThumb, value && styles.switchThumbOn]} /></View></Pressable>;
}

export function CheckControl({ checked, label, onChange }: { checked: boolean; label: string; onChange?: (value: boolean) => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange?.(!checked)} style={styles.checkRow}><View style={[styles.checkBox, checked && styles.checkBoxOn]}>{checked ? <Text style={styles.checkMark}>✓</Text> : null}</View><Text style={[styles.checkLabel, checked && styles.checkLabelDone]}>{label}</Text></Pressable>;
}

export function MetricCard({ label, value, detail, tone = Palette.cyan }: { label: string; value: string | number; detail?: string; tone?: string }) {
  return <Surface style={styles.metricCard}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color: tone }]}>{value}</Text>{detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}</Surface>;
}

export function ListRow({ leading, title, subtitle, trailing, onPress }: { leading?: ReactNode; title: string; subtitle?: string; trailing?: ReactNode; onPress?: () => void }) {
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && onPress && styles.pressed]}>{leading ? <View style={styles.listLeading}>{leading}</View> : null}<View style={styles.listCopy}><Text style={styles.listTitle}>{title}</Text>{subtitle ? <Text style={styles.listSubtitle}>{subtitle}</Text> : null}</View>{trailing ? <View>{trailing}</View> : null}</Pressable>;
}

const styles = StyleSheet.create({
  buttonPressable: { alignSelf: 'stretch', borderRadius: Radius.medium },
  button: { minHeight: 56, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.six },
  primaryButton: { minHeight: 56, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.six, shadowColor: Palette.sky, shadowOpacity: 0.42, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  secondaryButton: { minHeight: 48, borderWidth: Border.default, borderColor: Palette.sky, backgroundColor: 'rgba(0, 94, 255, 0.05)' },
  ghostButton: { minHeight: 40, backgroundColor: 'transparent' },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  primaryButtonLabel: { color: '#FFFFFF', fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 20 },
  buttonLabel: { color: Palette.cyan, fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 20 },
  ghostButtonLabel: { color: Palette.cyan, fontFamily: FontFamily.medium }, buttonIcon: { alignItems: 'center', justifyContent: 'center' },
  surface: { borderRadius: Radius.medium, borderWidth: Border.default, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Spacing.four },
  field: { gap: Spacing.two }, fieldLabel: { ...Typography.small, color: Palette.white }, input: { height: 48, borderRadius: Radius.small, borderWidth: Border.default, borderColor: '#006DD1', backgroundColor: Palette.backgroundDeep, color: Palette.white, paddingHorizontal: Spacing.three, ...Typography.caption },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: Radius.pill, backgroundColor: '#153A69' }, progressFill: { height: '100%', borderRadius: Radius.pill },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: Border.hairline, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 4 }, badgeDot: { width: 6, height: 6, borderRadius: 3 }, badgeText: { ...Typography.small, textTransform: 'capitalize' },
  iconTile: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: Radius.small, borderWidth: Border.default, borderColor: '#006DD1', backgroundColor: Palette.backgroundDeep, padding: Spacing.two }, iconTileActive: { backgroundColor: '#073B7B' }, iconTileLabel: { ...Typography.small, color: Palette.white },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.seven }, emptyIcon: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30, backgroundColor: '#073B7B' }, emptyTitle: { ...Typography.h3, color: Palette.white }, emptyDescription: { ...Typography.caption, color: Palette.muted, textAlign: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 9 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3A5A8A' }, dotActive: { backgroundColor: Palette.sky },
  segmented: { flexDirection: 'row', borderWidth: Border.default, borderColor: '#006DD1', borderRadius: Radius.small, backgroundColor: Palette.backgroundDeep, padding: 3 }, segment: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 7, paddingHorizontal: Spacing.two }, segmentSelected: { backgroundColor: Palette.sky }, segmentLabel: { ...Typography.small, color: Palette.muted, textTransform: 'capitalize' }, segmentLabelSelected: { color: '#FFFFFF', fontFamily: FontFamily.semibold },
  toggleRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.medium, borderWidth: Border.default, borderColor: Palette.border, backgroundColor: Palette.surface }, toggleCopy: { flex: 1, gap: 2 }, toggleLabel: { ...Typography.caption, color: Palette.white, fontFamily: FontFamily.medium }, toggleDescription: { ...Typography.small, color: Palette.muted }, switchTrack: { width: 46, height: 26, borderRadius: Radius.pill, backgroundColor: '#25456F', padding: 3 }, switchTrackOn: { backgroundColor: Palette.sky }, switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#C5D8F4' }, switchThumbOn: { alignSelf: 'flex-end', backgroundColor: '#FFFFFF' },
  checkRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, checkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: Border.default, borderColor: '#4774A8', alignItems: 'center', justifyContent: 'center' }, checkBoxOn: { borderColor: Palette.green, backgroundColor: Palette.green }, checkMark: { color: Palette.backgroundDeep, fontFamily: FontFamily.extraBold, fontSize: 13 }, checkLabel: { ...Typography.caption, color: Palette.white }, checkLabelDone: { color: Palette.muted, textDecorationLine: 'line-through' },
  metricCard: { flex: 1, minWidth: 104, gap: 2 }, metricLabel: { ...Typography.small, color: Palette.muted }, metricValue: { ...Typography.h2 }, metricDetail: { ...Typography.small, color: Palette.steel },
  listRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radius.medium, borderWidth: Border.default, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Spacing.three }, listLeading: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small, backgroundColor: Palette.backgroundDeep }, listCopy: { flex: 1, gap: 2 }, listTitle: { ...Typography.caption, color: Palette.white, fontFamily: FontFamily.medium }, listSubtitle: { ...Typography.small, color: Palette.muted },
});
