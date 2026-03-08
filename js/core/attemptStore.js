/**
 * @file attemptStore.js
 * @description Real-time Firestore listener for the current user's attempts.
 *              Other modules subscribe via `onAttemptsChanged` rather than
 *              setting up their own listeners.
 */

import {
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db }    from "./config.js";
import { onUserChange } from "./authState.js";

/** @type {Object[]} Cached attempt list, updated by Firestore listener */
let attempts = [];

/** @type {Set<Function>} */
const listeners = new Set();

/** @type {Function|null} Firestore unsubscribe handle */
let unsubscribeFirestore = null;

// ─── Listener lifecycle ───────────────────────────────────────────────────────

/**
 * Start the real-time Firestore listener for the current user's attempts.
 * No-ops if already running or no user is signed in.
 */
export function startAttemptListener() {
  const user = auth.currentUser;
  if (!user || unsubscribeFirestore) return;

  const q = query(
    collectionGroup(db, "attempts"),
    where("userID", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  unsubscribeFirestore = onSnapshot(q, snap => {
    attempts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notify();
  }, err => {
    console.error("[attemptStore] Firestore snapshot error:", err);
  });
}

/**
 * Stop the Firestore listener and clear cached attempts.
 * Called automatically on sign-out.
 */
export function stopAttemptListener() {
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    unsubscribeFirestore = null;
  }
  attempts = [];
  notify();
}

// Auto-manage listener lifecycle with auth state
onUserChange(user => {
  if (user)  startAttemptListener();
  else       stopAttemptListener();
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the current cached attempt list synchronously.
 * @returns {Object[]}
 */
export function getAttempts() {
  return attempts;
}

/**
 * Subscribe to attempt list changes.
 * Handler is called immediately with the current value.
 *
 * @param   {(attempts: Object[]) => void} fn
 * @returns {() => void} Unsubscribe function
 */
export function onAttemptsChanged(fn) {
  listeners.add(fn);
  fn(attempts); // fire immediately
  return () => listeners.delete(fn);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function notify() {
  listeners.forEach(fn => fn(attempts));
}