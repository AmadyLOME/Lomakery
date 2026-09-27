import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Les tokens push des membres sont stockés dans households/{householdId}/pushTokens/{uid}.
// L'envoi passe par l'API push d'Expo directement depuis le téléphone (pas de backend).
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Afficher les notifications même quand l'app est ouverte
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(uid: string, householdId: string) {
  if (!Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await setDoc(doc(db, 'households', householdId, 'pushTokens', uid), {
    token,
    updatedAt: serverTimestamp(),
  });
}

// Envoie une notification à tous les membres du foyer, sauf l'auteur de l'action
export async function notifyHousehold(householdId: string, title: string, body: string) {
  const senderUid = auth.currentUser?.uid;
  const snap = await getDocs(collection(db, 'households', householdId, 'pushTokens'));
  const messages = snap.docs
    .filter((d) => d.id !== senderUid)
    .map((d) => ({ to: d.data().token as string, title, body, sound: 'default' }));
  if (messages.length === 0) return;

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
}

// Version « fire and forget » pour les écrans : une notif ratée ne doit jamais bloquer l'action
export function notify(householdId: string, title: string, body: string) {
  notifyHousehold(householdId, title, body).catch((e) =>
    console.error('[notifications] notifyHousehold error:', e?.message ?? e)
  );
}

export function senderName(): string {
  return auth.currentUser?.displayName || "Quelqu'un";
}
