/**
 * @file auth.js
 * @description Handles all authentication UI: login, signup, logout modals,
 *              and updating the nav bar based on auth state.
 *
 *              Runs as a module — no DOMContentLoaded wrapper needed since
 *              ES modules are deferred by default.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth }     from "../core/config.js";
import { notify }   from "./ui.js";

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const loginBtn    = document.getElementById("login-btn");
const signupBtn   = document.getElementById("signup-btn");
const authButtons = document.getElementById("auth-buttons");
const userMenu    = document.getElementById("user-menu");

const loginModal  = document.getElementById("login-modal");
const signupModal = document.getElementById("signup-modal");

const loginEmail     = document.getElementById("login-email");
const loginPassword  = document.getElementById("login-password");
const loginSubmitBtn = document.getElementById("login-submit");

const signupEmail     = document.getElementById("signup-email");
const signupPassword  = document.getElementById("signup-password");
const signupSubmitBtn = document.getElementById("signup-submit");

const dropdown  = document.getElementById("profile-dropdown");
const logoutBtn = document.getElementById("logout-btn");

// Guard against missing DOM (e.g. in tests)
if (!loginBtn || !loginModal) {
  console.error("[auth] Required DOM elements missing — auth module inactive.");
}

// ─── Modal open / close ───────────────────────────────────────────────────────

loginBtn?.addEventListener("click",  () => loginModal.classList.remove("hidden"));
signupBtn?.addEventListener("click", () => signupModal.classList.remove("hidden"));

document.querySelectorAll(".close-modal").forEach(btn => {
  btn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    signupModal.classList.add("hidden");
  });
});

// ─── Sign up ──────────────────────────────────────────────────────────────────

signupSubmitBtn?.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value);
    signupModal.classList.add("hidden");
    notify({ message: "Account created — welcome!", type: "success", timeout: 3000 });
  } catch (err) {
    notify({ message: err.message, type: "warning" });
  }
});

// ─── Log in ───────────────────────────────────────────────────────────────────

loginSubmitBtn?.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    loginModal.classList.add("hidden");
  } catch (err) {
    notify({ message: err.message, type: "warning" });
  }
});

// ─── Log out ──────────────────────────────────────────────────────────────────

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  notify({ message: "Logged out", type: "success", timeout: 2000 });
  window.location.reload();
});

// ─── Auth state → UI ──────────────────────────────────────────────────────────

onAuthStateChanged(auth, user => {
  if (user) {
    authButtons?.classList.add("hidden");
    userMenu?.classList.remove("hidden");
    loginModal?.classList.add("hidden");
    signupModal?.classList.add("hidden");
  } else {
    authButtons?.classList.remove("hidden");
    userMenu?.classList.add("hidden");
    dropdown?.classList.add("hidden");
  }
});