import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Household } from '../types';

// Les codes d'invitation sont indexés dans invites/{code} → { householdId }.
// Les règles Firestore interdisent de lister les foyers : on ne peut
// retrouver un foyer qu'en connaissant son code.
const inviteDoc = (code: string) => doc(db, 'invites', code);

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateInviteCode();
    if (code.length === 6 && !(await getDoc(inviteDoc(code))).exists()) return code;
  }
  throw new Error("Impossible de générer un code d'invitation, réessayez.");
}

export async function createHousehold(name: string, ownerUid: string): Promise<string> {
  const ref = doc(collection(db, 'households'));
  const inviteCode = await generateUniqueInviteCode();
  const batch = writeBatch(db);
  batch.set(ref, {
    id: ref.id,
    name,
    members: [ownerUid],
    inviteCode,
    createdAt: serverTimestamp(),
  });
  batch.set(inviteDoc(inviteCode), { householdId: ref.id });
  await batch.commit();
  await setDoc(doc(db, 'users', ownerUid), { householdId: ref.id }, { merge: true });
  return ref.id;
}

export async function joinHousehold(inviteCode: string, uid: string): Promise<string | null> {
  const invite = await getDoc(inviteDoc(inviteCode.toUpperCase()));
  if (!invite.exists()) return null;
  const householdId: string = invite.data().householdId;
  await updateDoc(doc(db, 'households', householdId), { members: arrayUnion(uid) });
  await setDoc(doc(db, 'users', uid), { householdId }, { merge: true });
  return householdId;
}

// Crée l'entrée invites/{code} si elle manque (foyers créés avant son introduction)
async function ensureInvite(householdId: string, inviteCode: string) {
  const ref = inviteDoc(inviteCode);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { householdId });
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, 'households', householdId));
  if (!snap.exists()) return null;
  const household = snap.data() as Household;
  ensureInvite(snap.id, household.inviteCode).catch((e) => console.error('[invites] ensureInvite error:', e.code));
  return household;
}
