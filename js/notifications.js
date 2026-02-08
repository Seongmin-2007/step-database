export function notify({ title = "", message = "", type = "info", timeout = null }) {
  const container = document.getElementById("notifications");
  const el = document.createElement("div");
  el.className = `notification ${type}`;
  el.innerHTML = `
    ${title ? `<div class="notification-title">${title}</div>` : ""}
    <div class="notification-message">${message}</div>
  `;
  
  function close() {
    el.classList.add("closing");
    setTimeout(() => el.remove(), 120);
  }

  el.onclick = close;
  container.appendChild(el);
  if (timeout) setTimeout(close, timeout);
}