import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Les photos sont stockées en JPEG base64 directement dans Firestore
// (Firebase Storage exige l'offre payante Blaze). On les compresse donc fortement :
// un document Firestore est limité à 1 Mo.

export type PhotoSource = 'camera' | 'library';

interface PickOptions {
  width: number;             // largeur finale en pixels
  aspect: [number, number];  // cadrage proposé à l'utilisateur
}

export const AVATAR_OPTIONS: PickOptions = { width: 256, aspect: [1, 1] };
export const RECIPE_PHOTO_OPTIONS: PickOptions = { width: 900, aspect: [4, 3] };
export const FAMILY_PHOTO_OPTIONS: PickOptions = { width: 700, aspect: [1, 1] };

export function toDataUri(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

// Ouvre l'appareil photo ou la galerie, puis redimensionne et compresse.
// Retourne le JPEG en base64, ou null si l'utilisateur annule.
export async function pickPhoto(source: PhotoSource, options: PickOptions): Promise<string | null> {
  if (source === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Appareil photo', "Autorise l'accès à l'appareil photo dans les Réglages pour prendre une photo.");
      return null;
    }
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: options.aspect,
    quality: 1,
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(pickerOptions)
    : await ImagePicker.launchImageLibraryAsync(pickerOptions);
  if (result.canceled || !result.assets?.[0]) return null;

  const rendered = await ImageManipulator.manipulate(result.assets[0].uri)
    .resize({ width: options.width, height: null })
    .renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  return saved.base64 ?? null;
}

// Menu « Prendre une photo / Choisir dans la galerie / Supprimer »
export function askPhotoSource(
  title: string,
  onPick: (source: PhotoSource) => void,
  onRemove?: () => void
) {
  const buttons: Parameters<typeof Alert.alert>[2] = [
    { text: '📷 Prendre une photo', onPress: () => onPick('camera') },
    { text: '🖼 Choisir dans la galerie', onPress: () => onPick('library') },
  ];
  if (onRemove) buttons.push({ text: 'Supprimer la photo', style: 'destructive', onPress: onRemove });
  buttons.push({ text: 'Annuler', style: 'cancel' });
  Alert.alert(title, undefined, buttons);
}
