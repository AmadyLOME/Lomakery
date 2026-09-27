import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { InfoCard } from '../types';

// households/{householdId}/infos/{infoId} : une fiche par sujet (Wi-Fi, pédiatre…)
const infosCol = (householdId: string) => collection(db, 'households', householdId, 'infos');

export function subscribeToInfos(householdId: string, onChange: (infos: InfoCard[]) => void): Unsubscribe {
  return onSnapshot(
    infosCol(householdId),
    (snap) =>
      onChange(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as InfoCard))
          .sort((a, b) => a.title.localeCompare(b.title, 'fr'))
      ),
    (error) => console.error('[infos] onSnapshot error:', error.code)
  );
}

export async function saveInfo(householdId: string, info: Omit<InfoCard, 'id'>, infoId?: string) {
  if (infoId) await updateDoc(doc(db, 'households', householdId, 'infos', infoId), { ...info });
  else await addDoc(infosCol(householdId), info);
}

export function deleteInfo(householdId: string, infoId: string) {
  return deleteDoc(doc(db, 'households', householdId, 'infos', infoId));
}
