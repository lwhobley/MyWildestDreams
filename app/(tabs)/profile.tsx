import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDreams } from '@/hooks/useDreams';
import { DREAM_STYLES, DREAM_MOODS } from '@/constants/config';
import { calculateStreak } from '@/services/dreamService';
import { getSettings, updateSetting } from '@/services/settingsService';
import { areNotificationsEnabled, requestNotificationPermission, scheduleAllNotifications, cancelAllNotifications } from '@/services/notificationService';
import { useAuth } from '@/template';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useAlert } from '@/template';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { dreams, removeDream } = useDreams();
  const { showAlert } = useAlert();

  const { user, logout } = useAuth();
  const [privacyMode, setPrivacyMode] = useState(true);
  const [autoCaption, setAutoCaption] = useState(true);
  const [ambientSounds, setAmbientSounds] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setPrivacyMode(s.privacyMode);
      setAutoCaption(s.autoCaption);
      setAmbientSounds(s.ambientSounds);
    });
    areNotificationsEnabled().then(setNotificationsOn);
  }, []);

  async function handleToggle(key: 'privacyMode' | 'autoCaption' | 'ambientSounds', value: boolean) {
    if (key === 'privacyMode') setPrivacyMode(value);
    if (key === 'autoCaption') setAutoCaption(value);
    if (key === 'ambientSounds') setAmbientSounds(value);
    await updateSetting(key, value);
  }

  async function handleNotificationToggle(value: boolean) {
    setNotificationsOn(value);
    if (value) {
      const granted = await requestNotificationPermission();
      if (granted) await scheduleAllNotifications();
      else setNotificationsOn(false);
    } else {
      await cancelAllNotifications();
    }
  }

  async function handleSignOut() {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  }

  const totalDreams = dreams.length;
  const favorites = dreams.filter((d) => d.isFavorite).length;
  const streak = calculateStreak(dreams);

  const topStyle = DREAM_STYLES
    .map((s) => ({ ...s, count: dreams.filter((d) => d.styleId === s.id).length }))
    .sort((a, b) => b.count - a.count)[0];

  const topMood = DREAM_MOODS
    .map((m) => ({ ...m, count: dreams.filter((d) => d.moodId === m.id).length }))
    .sort((a, b) => b.count - a.count)[0];

  function handleExport() {
    showAlert(
      'Export Dreams',
      'Your dream archive will be exported as a JSON file. This feature is coming soon.',
      [{ text: 'Got it' }]
    );
  }

  async function handleClearData() {
    showAlert(
      'Clear All Data',
      'This will permanently delete all your dreams and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            const ids = [...dreams.map((d) => d.id)];
            for (const id of ids) await removeDream(id);
            showAlert('Cleared', 'All dream data has been removed.');
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>✦</Text>
          </View>
          <Text style={styles.name}>{user?.username ?? 'Dream Keeper'}</Text>
          <Text style={styles.subtitle}>
            {user?.email ?? 'Exploring the subconscious since ' + new Date().getFullYear()}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalDreams}</Text>
            <Text style={styles.statLabel}>Total Dreams</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.gold }]}>{favorites}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{topMood ? topMood.icon : '—'}</Text>
            <Text style={styles.statLabel}>Top Mood</Text>
          </View>
        </View>

        {/* Dream Insights */}
        {totalDreams > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dream Patterns</Text>
            <View style={styles.card}>
              {DREAM_STYLES.filter((s) =>
                dreams.some((d) => d.styleId === s.id)
              ).map((s) => {
                const count = dreams.filter((d) => d.styleId === s.id).length;
                const pct = Math.round((count / totalDreams) * 100);
                return (
                  <View key={s.id} style={styles.barRow}>
                    <Text style={styles.barLabel}>
                      {s.emoji} {s.label}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[styles.barFill, { width: `${pct}%`, backgroundColor: s.color }]}
                      />
                    </View>
                    <Text style={[styles.barPct, { color: s.color }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="lock" size={20} color={Colors.success} />
                <View>
                  <Text style={styles.settingLabel}>Privacy Mode</Text>
                  <Text style={styles.settingDesc}>Keep all data local to this device</Text>
                </View>
              </View>
              <Switch
                value={privacyMode}
                onValueChange={(v) => handleToggle('privacyMode', v)}
                trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
                thumbColor={privacyMode ? Colors.accent : Colors.textSubtle}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="closed-caption" size={20} color={Colors.accent} />
                <View>
                  <Text style={styles.settingLabel}>Auto-Caption</Text>
                  <Text style={styles.settingDesc}>Generate captions for all dreamscapes</Text>
                </View>
              </View>
              <Switch
                value={autoCaption}
                onValueChange={(v) => handleToggle('autoCaption', v)}
                trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
                thumbColor={autoCaption ? Colors.accent : Colors.textSubtle}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="notifications" size={20} color={Colors.info} />
                <View>
                  <Text style={styles.settingLabel}>Dream Reminders</Text>
                  <Text style={styles.settingDesc}>Morning reminder & streak alerts</Text>
                </View>
              </View>
              <Switch
                value={notificationsOn}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
                thumbColor={notificationsOn ? Colors.accent : Colors.textSubtle}
              />
            </View>
          </View>
        </View>

        {/* Account */}
        {user ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
              >
                <MaterialIcons name="logout" size={20} color={Colors.error} />
                <Text style={[styles.actionLabel, { color: Colors.error }]}>Sign Out</Text>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textSubtle} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Data Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="music-note" size={20} color={Colors.gold} />
                <View>
                  <Text style={styles.settingLabel}>Ambient Soundscapes</Text>
                  <Text style={styles.settingDesc}>Play ethereal audio during playback</Text>
                </View>
              </View>
              <Switch
                value={ambientSounds}
                onValueChange={(v) => handleToggle('ambientSounds', v)}
                trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
                thumbColor={ambientSounds ? Colors.accent : Colors.textSubtle}
              />
            </View>
          </View>
        </View>

        {/* Data Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <View style={styles.card}>
            <Pressable
              onPress={handleExport}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            >
              <MaterialIcons name="download" size={20} color={Colors.accent} />
              <Text style={styles.actionLabel}>Export Dream Archive</Text>
              <MaterialIcons name="chevron-right" size={20} color={Colors.textSubtle} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              onPress={handleClearData}
              style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            >
              <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
              <Text style={[styles.actionLabel, { color: Colors.error }]}>Clear All Data</Text>
              <MaterialIcons name="chevron-right" size={20} color={Colors.textSubtle} />
            </Pressable>
          </View>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>My Wildest Dreams v1.0 · Fully Encrypted · Local Mode</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: 48,
    gap: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  avatarText: {
    fontSize: 32,
    color: Colors.accent,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
  },
  subtitle: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.sm,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    color: Colors.accent,
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
  },
  statLabel: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  barLabel: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  barPct: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    width: 32,
    textAlign: 'right',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingLabel: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.medium,
  },
  settingDesc: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  actionLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.medium,
  },
  pressed: {
    opacity: 0.7,
  },
  versionText: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.lg,
  },
});
