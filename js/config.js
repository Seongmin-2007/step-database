import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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