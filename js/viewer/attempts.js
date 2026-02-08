import {
    addDoc,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "../config.js";

export async function saveAttempt(uid, qid, attempt) {
    await addDoc(
        collection(db, "users", uid, "questions", qid, "attempts"),
        { ...attempt, createdAt: serverTimestamp() }
    );
}

export async function loadAttempts(uid, qid) {
    const q = query(
        collection(db, "users", uid, "questions", qid, "attempts"),
        where("status", "==", "completed"),
        orderBy("createdAt", "desc")
    );
    return getDocs(q);
}
