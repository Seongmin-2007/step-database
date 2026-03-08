/**
 * @file eventBus.js
 * @description Lightweight publish/subscribe system for decoupled inter-module
 *              communication. Avoids direct imports between sibling modules.
 *
 * @example
 *   import { on, emit } from "../core/eventBus.js";
 *
 *   // Subscribe
 *   on("filter:apply", tag => { ... });
 *
 *   // Publish
 *   emit("filter:apply", "algebra");
 */

/** @type {Record<string, Function[]>} */
const listeners = {};

/**
 * Subscribe to an event.
 * @param {string}   event
 * @param {Function} handler
 * @returns {Function} Unsubscribe function
 */
export function on(event, handler) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(handler);
  return () => off(event, handler);
}

/**
 * Unsubscribe a specific handler from an event.
 * @param {string}   event
 * @param {Function} handler
 */
export function off(event, handler) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(h => h !== handler);
}

/**
 * Emit an event, calling all registered handlers with the payload.
 * @param {string} event
 * @param {*}      [payload]
 */
export function emit(event, payload) {
  (listeners[event] ?? []).forEach(handler => handler(payload));
}