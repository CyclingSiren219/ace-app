// src/services/firebaseService.js
// All Firebase Auth + Firestore operations for the web app.
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, addDoc, query, where, orderBy, limit,
  onSnapshot, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as firebaseSignOut, onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';

// ── AUTH ──
export const signUp = async (email, password, username) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    username, email, created_at: serverTimestamp(),
  });
  return cred;
};

export const logIn = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const signOut = () => firebaseSignOut(auth);

export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

// ── USERS ──
export const getUserDoc = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ── HUB ──
export const subscribeToHub = (hubId, cb) =>
  onSnapshot(doc(db, 'hubs', hubId), (snap) => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() });
  });

export const subscribeToCourts = (hubId, cb) => {
  const ref = collection(db, 'hubs', hubId, 'courts');
  return onSnapshot(ref, (snap) => {
    const courts = [];
    snap.forEach((d) => courts.push({ id: d.id, ...d.data() }));
    courts.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    cb(courts);
  });
};

export const subscribeToWaitlist = (hubId, cb) => {
  const ref = collection(db, 'hubs', hubId, 'waitlist');
  const q = query(ref, orderBy('timestamp', 'asc'));
  return onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    cb(list);
  });
};

// ── COURT CLAIMING (transaction-safe) ──
export const claimCourt = async (hubId, courtId, uid) => {
  const courtRef = doc(db, 'hubs', hubId, 'courts', courtId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(courtRef);
    if (!snap.exists()) throw new Error('Court does not exist.');
    if (snap.data().status !== 'open') throw new Error('Court is no longer open.');
    tx.update(courtRef, { status: 'active', current_player_uid: uid });
  });
};

// ── WAITLIST ──
export const joinWaitlist = async (hubId, uid, groupSize = 1, isOpen = true) => {
  const ref = collection(db, 'hubs', hubId, 'waitlist');
  const existing = query(ref, where('uid', '==', uid));
  const snap = await getDocs(existing);
  if (!snap.empty) throw new Error('You are already on the waitlist.');
  await addDoc(ref, { uid, timestamp: Date.now(), group_size: groupSize, is_open: isOpen });
};

export const leaveWaitlist = async (hubId, uid) => {
  const ref = collection(db, 'hubs', hubId, 'waitlist');
  const q = query(ref, where('uid', '==', uid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

export const releaseCourt = async (hubId, courtId) => {
  const courtRef = doc(db, 'hubs', hubId, 'courts', courtId);
  const waitRef = collection(db, 'hubs', hubId, 'waitlist');
  const q = query(waitRef, orderBy('timestamp', 'asc'), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const next = snap.docs[0];
    await updateDoc(courtRef, { status: 'active', current_player_uid: next.data().uid });
    await deleteDoc(next.ref);
  } else {
    await updateDoc(courtRef, { status: 'open', current_player_uid: null });
  }
};

export const setCourtPending = async (hubId, courtId) => {
  await updateDoc(doc(db, 'hubs', hubId, 'courts', courtId), { status: 'pending' });
};
