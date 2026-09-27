import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteField,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { MemberProfile } from '../types';

// Profils publics des membres (nom + photo) : households/{householdId}/members/{uid}.
// Lisibles par tout le foyer, chacun ne modifie que le sien.
const memberDoc = (householdId: string, uid: string) =>
  doc(db, 'households', householdId, 'members', uid);

export function subscribeToMembers(
  householdId: string,
  onChange: (members: MemberProfile[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'households', householdId, 'members'),
    (snap) => onChange(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as MemberProfile))),
    (error) => console.error('[members] onSnapshot error:', error.code)
  );
}

// Publie le nom du membre (appelé à chaque lancement, ne touche pas à la photo)
export async function ensureMemberProfile(householdId: string, uid: string, displayName: string) {
  await setDoc(memberDoc(householdId, uid), { displayName, updatedAt: serverTimestamp() }, { merge: true });
}

export async function setMemberPhoto(householdId: string, uid: string, photo: string | null) {
  await setDoc(
    memberDoc(householdId, uid),
    { photo: photo ?? deleteField(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}
