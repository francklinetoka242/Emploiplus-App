import AsyncStorage from '@react-native-async-storage/async-storage';

export const FONT_SCALE_OPTIONS = [0.85, 1, 1.15, 1.3] as const;
export const FONT_SCALE_LABELS = ['Petit', 'Normal', 'Grand', 'Très grand'] as const;

const FONT_SCALE_STORAGE_KEY = 'emploiplus_font_scale';

export function getDefaultFontScale() {
  return FONT_SCALE_OPTIONS[1];
}

export function getFontScaleIndex(value: number) {
  const normalized = Number.isFinite(value) ? value : getDefaultFontScale();
  const index = FONT_SCALE_OPTIONS.findIndex((scale) => Math.abs(scale - normalized) < 0.01);
  return index >= 0 ? index : 1;
}

export async function getStoredFontScale(): Promise<number> {
  try {
    const rawValue = await AsyncStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (!rawValue) {
      return getDefaultFontScale();
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      return getDefaultFontScale();
    }

    const clampedValue = Math.min(Math.max(parsedValue, FONT_SCALE_OPTIONS[0]), FONT_SCALE_OPTIONS[FONT_SCALE_OPTIONS.length - 1]);
    const closestIndex = FONT_SCALE_OPTIONS.findIndex((scale) => Math.abs(scale - clampedValue) < 0.01);
    return FONT_SCALE_OPTIONS[closestIndex >= 0 ? closestIndex : 1];
  } catch (_error) {
    return getDefaultFontScale();
  }
}

export async function setStoredFontScale(value: number) {
  const normalized = Number.isFinite(value) ? value : getDefaultFontScale();
  const clampedValue = Math.min(Math.max(normalized, FONT_SCALE_OPTIONS[0]), FONT_SCALE_OPTIONS[FONT_SCALE_OPTIONS.length - 1]);
  const closestIndex = FONT_SCALE_OPTIONS.findIndex((scale) => Math.abs(scale - clampedValue) < 0.01);
  const safeValue = FONT_SCALE_OPTIONS[closestIndex >= 0 ? closestIndex : 1];

  await AsyncStorage.setItem(FONT_SCALE_STORAGE_KEY, String(safeValue));
  return safeValue;
}
