import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCS9vJK43Ix6JEenLSmc5YAdxcfAvxEdwo',
  authDomain: 'lomakery.firebaseapp.com',
  projectId: 'lomakery',
  storageBucket: 'lomakery.firebasestorage.app',
  messagingSenderId: '264471064397',
  appId: '1:264471064397:web:daa4605890af6d58ab9104',
};

const app = initializeApp(firebaseConfig);

// Session conservée sur le téléphone : pas besoin de se reconnecter à chaque lancement
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
