import {
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from "./config.js";

let attempts = [];
let listeners = [];
let unsubscribe = null;

/* ================================
   SUBSCRIBE TO ATTEMPTS
================================ */

export function startAttemptListener() {

  const user = auth.currentUser;
  if (!user || unsubscribe) return;

  const q = query(
    collectionGroup(db, "attempts"),
    where("userID", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  unsubscribe = onSnapshot(q, snap => {

    attempts = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    notify();
  });
}

/* ================================
   GET DATA
================================ */

export function getAttempts() {
  return attempts;
}

/* ================================
   LISTEN FOR CHANGES
================================ */

export function onAttemptsChanged(fn) {
  listeners.push(fn);
}

function notify() {
  listeners.forEach(fn => fn(attempts));
}