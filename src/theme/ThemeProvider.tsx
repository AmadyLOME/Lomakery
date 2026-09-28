import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyScheme, ColorScheme } from '../constants/theme';

export type AppearancePreference = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'appearance';

interface ThemeValue {
  scheme: ColorScheme;                 // thème effectivement affiché
  preference: AppearancePreference;    // réglage du Profil (propre au téléphone)
  setPreference: (p: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeValue>({ scheme: 'light', preference: 'auto', setPreference: () => {} });

// Charge le réglage « Apparence » avant d'afficher l'app, pour éviter un flash clair
export async function loadAppearancePreference(): Promise<AppearancePreference> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function ThemeProvider({ initialPreference, children }: { initialPreference: AppearancePreference; children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<AppearancePreference>(initialPreference);
  const scheme: ColorScheme = preference === 'auto' ? (system === 'dark' ? 'dark' : 'light') : preference;

  // Les couleurs partagées doivent être à jour avant le rendu des enfants
  const applied = useRef<ColorScheme | null>(null);
  if (applied.current !== scheme) {
    applyScheme(scheme);
    applied.current = scheme;
  }

  const setPreference = (p: AppearancePreference) => {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  return <ThemeContext.Provider value={{ scheme, preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Styles recalculés au changement de thème (une fois par thème pour tout l'écran, pas par instance)
const cache = new Map<() => any, { scheme: ColorScheme; styles: any }>();

export function useStyles<T>(makeStyles: () => T): T {
  const { scheme } = useTheme();
  const hit = cache.get(makeStyles);
  if (hit && hit.scheme === scheme) return hit.styles;
  const styles = makeStyles();
  cache.set(makeStyles, { scheme, styles });
  return styles;
}
