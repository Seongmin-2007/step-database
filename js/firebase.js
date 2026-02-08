import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, deleteDoc, collection, collectionGroup, query, where, orderBy, limit, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcv6laZwXfelshtVuTkMiU2LpTeXccRVk",
  authDomain: "step-questions-tracker.firebaseapp.com",
  projectId: "step-questions-tracker",
  storageBucket: "step-questions-tracker.firebasestorage.app",
  messagingSenderId: "1002860931411",
  appId: "1:1002860931411:web:35cbe1dc1fc574e3c099a6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Re-export everything for other files to use
export { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  doc, setDoc, getDoc, addDoc, deleteDoc, collection, collectionGroup, query, where, orderBy, limit, getDocs, serverTimestamp 
};