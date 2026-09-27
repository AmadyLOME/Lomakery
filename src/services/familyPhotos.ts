import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { FamilyPhoto } from '../types';

// households/{householdId}/familyPhotos/{photoId} : JPEG compressé (≈ 60 Ko) + légende
export const MAX_FAMILY_PHOTOS = 5;

const photosCol = (householdId: string) => collection(db, 'households', householdId, 'familyPhotos');

export function subscribeToFamilyPhotos(householdId: string, onChange: (photos: FamilyPhoto[]) => void): Unsubscribe {
  return onSnapshot(
    photosCol(householdId),
    (snap) =>
      onChange(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as FamilyPhoto))
          .sort((a, b) => a.createdAt - b.createdAt)
      ),
    (error) => console.error('[familyPhotos] onSnapshot error:', error.code)
  );
}

export async function addFamilyPhoto(householdId: string, data: string, uid: string, name: string) {
  await addDoc(photosCol(householdId), { data, caption: '', addedBy: uid, addedByName: name, createdAt: Date.now() });
}

export function replaceFamilyPhoto(householdId: string, photoId: string, data: string, uid: string, name: string) {
  return updateDoc(doc(db, 'households', householdId, 'familyPhotos', photoId), { data, addedBy: uid, addedByName: name });
}

export function setPhotoCaption(householdId: string, photoId: string, caption: string) {
  return updateDoc(doc(db, 'households', householdId, 'familyPhotos', photoId), { caption });
}

export function removeFamilyPhoto(householdId: string, photoId: string) {
  return deleteDoc(doc(db, 'households', householdId, 'familyPhotos', photoId));
}
