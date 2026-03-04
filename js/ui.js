import { formatTime, firebaseTimeToDate } from "./utils.js";
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./config.js";

/**
 * Creates a card element for a single attempt.
 * @param {Object} attemptDoc - Firestore doc or cached object.
 *   Should have: { id, ref?, data: ()=>object, userID?, questionID? }
 */
export function createAttemptCard(attemptDoc, parameters={includeID:false}) {
    const data = attemptDoc.data();
    const attemptCard = document.createElement("li");
    attemptCard.innerHTML = `
        <div class="past-attempt">
            <div class="delete-attempt" title="Delete">×</div>
            
            <div class="past-meta">
                ${includeID ? (`ID: ${data.questionID}<br>`) : ""}
                Date: ${firebaseTimeToDate(data.createdAt)}<br>
                Time taken: ${data.time == 0 ? "N/A" : formatTime(data.time)}<br>
                Difficulty: ${"★".repeat(data.difficulty ?? 0)}<br>
                Notes:
            </div>
            <div class="past-notes">
                ${data.notes}
            </div>
        </div>
    `;

    const deleteButton = attemptCard.querySelector(".delete-attempt");
    let armed = false;
    let armTimeout = null;

    deleteButton.addEventListener("click", async () => {
        if (!armed) {
            armed = true;
            deleteButton.classList.add("confirm");

            armTimeout = setTimeout(() => {
                armed = false;
                deleteButton.classList.remove("confirm");
            }, 2000);

            return;
        }

        clearTimeout(armTimeout);
        try {
            const attemptRef = attemptDoc.ref 
                || doc(
                    db,
                    "users",
                    data.userID || auth.currentUser.uid,
                    "questions",
                    data.questionID,
                    "attempts",
                    attemptDoc.id
                );

            await deleteDoc(attemptRef);
            localStorage.removeItem("attempts:" + data.questionID);
            attemptCard.remove();
        } catch (err) {
            notify({
                message: "Couldn't delete",
                type: "warning",
                timeout: 2000
            });
            deleteButton.classList.remove("confirm");
            armed = false;
        }
    });

    return attemptCard;
}

export function notify({
    title = "",
    message = "",
    type = "info", // info | success | warning | danger
    timeout = null // in ms or null
}) {
    console.log(message);
    const container = document.getElementById("notifications");

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        ${title ? `<div class="notification-title">${title}</div>` : ""}
        <div class="notification-message">${message}</div>
    `;

    container.appendChild(notification);

    function close() {
        notification.classList.add("closing");
        setTimeout(() => notification.remove(), 120);
    }

    if (timeout) {
        setTimeout(close, timeout);
    }
}