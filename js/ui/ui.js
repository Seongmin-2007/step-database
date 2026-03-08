/**
 * @file ui.js
 * @description Shared UI components used across multiple views.
 *
 *   - notify()           — toast notification system
 *   - createAttemptCard() — renders a single attempt as a list item
 */

import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db }          from "../core/config.js";
import { formatTime, timestampToDateStr } from "../core/utils.js";
import { DELETE_ARM_MS }     from "../core/constants.js";

// ─── Notification system ──────────────────────────────────────────────────────

/**
 * @typedef {"info"|"success"|"warning"|"danger"} NotificationType
 */

/**
 * Show a toast notification.
 *
 * @param {Object}           opts
 * @param {string}           [opts.title]
 * @param {string}           opts.message
 * @param {NotificationType} [opts.type="info"]
 * @param {number|null}      [opts.timeout]   Auto-dismiss after ms, or null for sticky
 */
export function notify({ title = "", message = "", type = "info", timeout = null }) {
  const container = document.getElementById("notifications");
  if (!container) { console.warn("[notify]", message); return; }

  const el = document.createElement("div");
  el.className = `notification ${type}`;
  el.innerHTML = `
    ${title ? `<div class="notification-title">${title}</div>` : ""}
    <div class="notification-message">${message}</div>
  `;

  // Click to dismiss
  el.addEventListener("click", () => dismiss(el));
  container.appendChild(el);

  if (timeout) setTimeout(() => dismiss(el), timeout);
}

function dismiss(el) {
  el.classList.add("closing");
  setTimeout(() => el.remove(), 120);
}

// ─── Attempt card component ───────────────────────────────────────────────────

/**
 * Create a `<li>` element representing a single attempt.
 *
 * @param {Object}  attemptDoc               Firestore doc-like object
 * @param {string}  attemptDoc.id
 * @param {Function} attemptDoc.data          Returns the attempt data object
 * @param {Object}  [attemptDoc.ref]          Firestore DocumentReference (optional)
 * @param {Object}  [opts]
 * @param {boolean} [opts.includeID=false]    Whether to show the question ID in the card
 * @returns {HTMLLIElement}
 */
export function createAttemptCard(attemptDoc, opts = { includeID: false }) {
  const data = attemptDoc.data();
  const li   = document.createElement("li");

  li.innerHTML = `
    <div class="past-attempt">
      <div class="delete-attempt" title="Delete attempt">×</div>
      <div class="past-meta">
        ${opts.includeID ? `ID: ${data.questionID}<br>` : ""}
        Date: ${timestampToDateStr(data.createdAt)}<br>
        Time taken: ${data.time === 0 ? "N/A" : formatTime(data.time)}<br>
        Difficulty: ${"★".repeat(data.difficulty ?? 0)}${"☆".repeat(5 - (data.difficulty ?? 0))}<br>
        Notes:
      </div>
      <div class="past-notes">${data.notes ?? ""}</div>
    </div>
  `;

  _bindDeleteButton(li, attemptDoc, data);
  return li;
}

/**
 * Wire up the two-click delete confirmation on an attempt card.
 * @private
 */
function _bindDeleteButton(li, attemptDoc, data) {
  const btn = li.querySelector(".delete-attempt");
  let armed = false;
  let armTimer = null;

  btn.addEventListener("click", async () => {
    if (!armed) {
      // First click — arm
      armed = true;
      btn.classList.add("confirm");
      armTimer = setTimeout(() => {
        armed = false;
        btn.classList.remove("confirm");
      }, DELETE_ARM_MS);
      return;
    }

    // Second click — execute
    clearTimeout(armTimer);

    try {
      const ref = attemptDoc.ref ?? doc(
        db,
        "users",    data.userID ?? auth.currentUser?.uid,
        "questions", data.questionID,
        "attempts",  attemptDoc.id
      );

      await deleteDoc(ref);
      localStorage.removeItem(`attempts:${data.questionID}`);
      li.remove();
    } catch (err) {
      console.error("[createAttemptCard] Delete failed:", err);
      notify({ message: "Couldn't delete attempt", type: "warning", timeout: 2000 });
      btn.classList.remove("confirm");
      armed = false;
    }
  });
}