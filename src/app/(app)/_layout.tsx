import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Palette } from '@/constants/theme';

export default function ProductTabsLayout() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  return <NativeTabs backgroundColor={isDark ? '#05152B' : '#F7FAFF'} indicatorColor={isDark ? '#0B294B' : '#E8F0FA'} tintColor={Palette.cyan} labelStyle={{ selected: { color: Palette.cyan }, default: { color: isDark ? '#7FA5D4' : '#52647B' } }}>
    <NativeTabs.Trigger name="home"><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon md={{ default: 'home', selected: 'home_filled' }} sf={{ default: 'house', selected: 'house.fill' }} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="projects"><NativeTabs.Trigger.Label>Projects</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon md={{ default: 'folder', selected: 'folder' }} sf={{ default: 'folder', selected: 'folder.fill' }} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="progress"><NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon md={{ default: 'bar_chart', selected: 'bar_chart' }} sf="chart.bar" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="settings"><NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon md={{ default: 'settings', selected: 'settings' }} sf="gear" /></NativeTabs.Trigger>
  </NativeTabs>;
}
