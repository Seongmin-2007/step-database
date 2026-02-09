// eventBus.js
//
// A tiny publish/subscribe system for modular communication.
// Any module can emit events, any module can listen to them.

const listeners = {};

// Subscribe to an event
export function on(event, handler) {
    if (!listeners[event]) {
        listeners[event] = [];
    }
    listeners[event].push(handler);
}

// Emit an event
export function emit(event, payload) {
    if (listeners[event]) {
        listeners[event].forEach(handler => handler(payload));
    }
}
