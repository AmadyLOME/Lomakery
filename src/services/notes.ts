import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { FamilyNote } from '../types';

// households/{householdId}/notes/{noteId} : chaque mot est un document,
// deux membres qui écrivent en même temps ne s'écrasent donc jamais.
const notesCol = (householdId: string) => collection(db, 'households', householdId, 'notes');

export function subscribeToNotes(householdId: string, onChange: (notes: FamilyNote[]) => void): Unsubscribe {
  return onSnapshot(
    notesCol(householdId),
    (snap) =>
      onChange(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as FamilyNote))
          // épinglés d'abord, puis du plus récent au plus ancien
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt)
      ),
    (error) => console.error('[notes] onSnapshot error:', error.code)
  );
}

export async function addNote(householdId: string, text: string, authorUid: string, authorName: string) {
  await addDoc(notesCol(householdId), { text, authorUid, authorName, createdAt: Date.now(), pinned: false });
}

export function setNotePinned(householdId: string, noteId: string, pinned: boolean) {
  return updateDoc(doc(db, 'households', householdId, 'notes', noteId), { pinned });
}

export function deleteNote(householdId: string, noteId: string) {
  return deleteDoc(doc(db, 'households', householdId, 'notes', noteId));
}

// ─── « … écrit un mot » ──────────────────────────────────────────────────────
// households/{householdId}/typing/{uid} → { name, at } ; considéré actif pendant quelques secondes

export const TYPING_TTL_MS = 6000;

export function setTyping(householdId: string, uid: string, name: string, typing: boolean) {
  return setDoc(doc(db, 'households', householdId, 'typing', uid), { name, at: typing ? Date.now() : 0 });
}

export function subscribeToTyping(
  householdId: string,
  onChange: (typers: { uid: string; name: string; at: number }[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'households', householdId, 'typing'),
    (snap) => onChange(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as { name: string; at: number }) }))),
    (error) => console.error('[typing] onSnapshot error:', error.code)
  );
}
