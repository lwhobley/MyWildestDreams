import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@mwd_settings';

export interface AppSettings {
  privacyMode: boolean;
  autoCaption: boolean;
  ambientSounds: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  privacyMode: true,
  autoCaption: true,
  ambientSounds: false,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const current = await getSettings();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, [key]: value }));
}
