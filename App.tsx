import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { useEffect, useState } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme, loadAppearancePreference, AppearancePreference } from './src/theme/ThemeProvider';

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Caveat_700Bold,
  });
  // Réglage « Apparence » lu avant le premier affichage (pas de flash clair en mode sombre)
  const [appearance, setAppearance] = useState<AppearancePreference | null>(null);
  useEffect(() => {
    loadAppearancePreference().then(setAppearance);
  }, []);

  // En cas d'échec de chargement, on affiche l'app avec la police système plutôt que rien
  if ((!fontsLoaded && !fontError) || !appearance) return null;

  return (
    <ThemeProvider initialPreference={appearance}>
      <ThemedStatusBar />
      <AppNavigator />
    </ThemeProvider>
  );
}
