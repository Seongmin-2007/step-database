export function notify({
  title = "",
  message = "",
  type = "info",           // info | success | warning | danger
  actions = [],            // [{ label, onClick, style }]
  timeout = null           // ms or null
}) {
  const container = document.getElementById("notifications");

  const el = document.createElement("div");
  el.className = `notification ${type}`;

  el.innerHTML = `
    ${title ? `<div class="notification-title">${title}</div>` : ""}
    <div class="notification-message">${message}</div>
    ${actions.length ? `<div class="notification-actions"></div>` : ""}
  `;

  // Actions
  if (actions.length) {
    const actionsEl = el.querySelector(".notification-actions");

    actions.forEach(({ label, onClick, style }) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      if (style === "danger") btn.classList.add("btn-danger");

      btn.onclick = () => {
        if (onClick) onClick();
        close();
      };

      actionsEl.appendChild(btn);
    });
  }

  function close() {
    el.classList.add("closing");
    setTimeout(() => el.remove(), 120);
  }

  container.appendChild(el);

  if (timeout) {
    setTimeout(close, timeout);
  }

  return { close };
}
