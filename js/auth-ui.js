import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase.js";

export function initAuthUI() {
  const loginModal = document.getElementById("login-modal");
  const signupModal = document.getElementById("signup-modal");
  const userMenu = document.getElementById("user-menu");
  const authButtons = document.getElementById("auth-buttons");
  const profileDropdown = document.getElementById("profile-dropdown");

  // Open Buttons
  document.getElementById("login-btn").onclick = () => loginModal.classList.remove("hidden");
  document.getElementById("signup-btn").onclick = () => signupModal.classList.remove("hidden");

  // Close Buttons
  document.querySelectorAll(".close-modal").forEach(b => {
    b.onclick = () => {
      loginModal.classList.add("hidden");
      signupModal.classList.add("hidden");
    };
  });

  // Submit Actions
  document.getElementById("signup-submit").onclick = async () => {
    try {
      await createUserWithEmailAndPassword(auth, document.getElementById("signup-email").value, document.getElementById("signup-password").value);
      signupModal.classList.add("hidden");
    } catch (e) { alert(e.message); }
  };

  document.getElementById("login-submit").onclick = async () => {
    try {
      await signInWithEmailAndPassword(auth, document.getElementById("login-email").value, document.getElementById("login-password").value);
      loginModal.classList.add("hidden");
    } catch (e) { alert(e.message); }
  };

  // Profile Menu
  document.getElementById("profile-btn").onclick = () => profileDropdown.classList.toggle("hidden");
  document.getElementById("logout-btn").onclick = async () => await signOut(auth);

  // Auth State Listener
  onAuthStateChanged(auth, user => {
    if (user) {
      authButtons.classList.add("hidden");
      userMenu.classList.remove("hidden");
      loginModal.classList.add("hidden");
      signupModal.classList.add("hidden");
    } else {
      authButtons.classList.remove("hidden");
      userMenu.classList.add("hidden");
      profileDropdown.classList.add("hidden");
    }
  });
}