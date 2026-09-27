// `firebase/auth` n'expose pas de types spécifiques à React Native : à l'exécution,
// Metro résout bien le build RN de @firebase/auth qui contient getReactNativePersistence.
import { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
