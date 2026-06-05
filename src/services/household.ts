import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Household } from '../types';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createHousehold(name: string, ownerUid: string): Promise<string> {
  const ref = doc(collection(db, 'households'));
  const inviteCode = generateInviteCode();
  await setDoc(ref, {
    id: ref.id,
    name,
    members: [ownerUid],
    inviteCode,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'users', ownerUid), { householdId: ref.id }, { merge: true });
  return ref.id;
}

export async function joinHousehold(inviteCode: string, uid: string): Promise<string | null> {
  const q = query(collection(db, 'households'), where('inviteCode', '==', inviteCode.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const householdDoc = snap.docs[0];
  await updateDoc(householdDoc.ref, { members: arrayUnion(uid) });
  await setDoc(doc(db, 'users', uid), { householdId: householdDoc.id }, { merge: true });
  return householdDoc.id;
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, 'households', householdId));
  return snap.exists() ? (snap.data() as Household) : null;
}
