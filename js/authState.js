import { auth } from "./config.js";

let currentUser = null;
const listeners = new Set();

auth.onAuthStateChanged(user => {
    currentUser = user;
    listeners.forEach(fn => fn(user));
});

export function onUserChange(fn) {
    listeners.add(fn);
    fn(currentUser); // run immediately
    return () => listeners.delete(fn); // unsubscribe
}

export function getCurrentUser() {
    return currentUser;
}
