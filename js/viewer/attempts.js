/**
 * @file attempts.js
 * @description Firestore read/write operations for per-question attempts.
 *              All Firestore interaction for the viewer goes through here.
 */

import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../core/config.js";

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Save a completed attempt to Firestore.
 *
 * @param {string} uid      Firebase user UID
 * @param {string} qid      Question ID e.g. "2022-S2-Q5"
 * @param {{ status: string, time: number, difficulty: number, notes: string }} attempt
 * @returns {Promise<void>}
 */
export async function saveAttempt(uid, qid, attempt) {
  try {
    await addDoc(
      collection(db, "users", uid, "questions", qid, "attempts"),
      { ...attempt, userID: uid, questionID: qid, createdAt: serverTimestamp() }
    );
  } catch (err) {
    console.error("[attempts] saveAttempt failed:", err);
    throw err; // re-throw so caller can notify user
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load all completed attempts for a question, newest first.
 *
 * @param {string} uid
 * @param {string} qid
 * @returns {Promise<import("firebase/firestore").QuerySnapshot>}
 */
export async function loadAttempts(uid, qid) {
  try {
    const q = query(
      collection(db, "users", uid, "questions", qid, "attempts"),
      where("status", "==", "completed"),
      orderBy("createdAt", "desc")
    );
    return getDocs(q);
  } catch (err) {
    console.error("[attempts] loadAttempts failed:", err);
    throw err;
  }
}