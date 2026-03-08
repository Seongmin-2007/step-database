/**
 * @file authState.js
 * @description Reactive Firebase auth state singleton.
 *              Provides the current user and a subscription mechanism
 *              so any module can react to login/logout without tight coupling.
 */

import { auth } from "./config.js";

/** @type {import("firebase/auth").User|null} */
let currentUser = null;

/** @type {Set<Function>} */
const listeners = new Set();

auth.onAuthStateChanged(user => {
  currentUser = user;
  listeners.forEach(fn => fn(user));
});

/**
 * Subscribe to auth state changes.
 * The handler is called immediately with the current user value.
 *
 * @param   {(user: import("firebase/auth").User|null) => void} fn
 * @returns {() => void} Unsubscribe function
 */
export function onUserChange(fn) {
  listeners.add(fn);
  fn(currentUser); // fire immediately with current value
  return () => listeners.delete(fn);
}

/**
 * Get the currently signed-in user synchronously.
 * @returns {import("firebase/auth").User|null}
 */
export function getCurrentUser() {
  return currentUser;
}