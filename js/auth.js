import { auth } from "./config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { notify } from "./ui.js";

// Buttons
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const authButtons = document.getElementById("auth-buttons");
const userMenu = document.getElementById("user-menu");

// Modals
const loginModal = document.getElementById("login-modal");
const signupModal = document.getElementById("signup-modal");

// Inputs
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginSubmitBtn = document.getElementById("login-submit");
const signupEmail = document.getElementById("signup-email");
const signupPassword = document.getElementById("signup-password");
const singupSubmitBtn = document.getElementById("signup-submit");

// Profile
const dropdown = document.getElementById("profile-dropdown");
const logoutBtn = document.getElementById("logout-btn");

// --- Modal open / close ---
loginBtn.onclick = () => loginModal.classList.remove("hidden");
signupBtn.onclick = () => signupModal.classList.remove("hidden");

document.querySelectorAll(".close-modal").forEach(btn => {
    btn.onclick = () => {
        loginModal.classList.add("hidden");
        signupModal.classList.add("hidden");
    };
});

// --- Signup ---
singupSubmitBtn.onclick = async () => {
    try {
        await createUserWithEmailAndPassword(
            auth,
            signupEmail.value,
            signupPassword.value
        );
        signupModal.classList.add("hidden");
    } catch (e) {
        notify(e.message, "warning");
    }
};

// --- Login ---
loginSubmitBtn.onclick = async () => {
    try {
        await signInWithEmailAndPassword(
            auth,
            loginEmail.value,
            loginPassword.value
        );
        loginModal.classList.add("hidden");
    } catch (e) {
        notify(e.message, "warning");
    }
};

// --- Logout ---
logoutBtn.onclick = async () => {
    await signOut(auth);
    notify("Logged out!");
    window.location.reload();
};

// --- Auth state UI ---
onAuthStateChanged(auth, user => {
    if (user) {
        authButtons.classList.add("hidden");
        userMenu.classList.remove("hidden");
        loginModal.classList.add("hidden");
        signupModal.classList.add("hidden");
    } else {
        authButtons.classList.remove("hidden");
        userMenu.classList.add("hidden");
        dropdown.classList.add("hidden");
    }
});
