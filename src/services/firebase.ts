import { initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';
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

export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
});
export const db = getFirestore(app);
