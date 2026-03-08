/**
 * @file imageZoom.js
 * @description Lightbox zoom for question and solution images.
 *
 * Call initImageZoom() once on app load. Any <img> inside
 * .question-content or #solution-container becomes zoomable.
 * Click the image (or the backdrop, or press Escape) to dismiss.
 */

// ─── State ────────────────────────────────────────────────────────────────────

let overlay = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Set up zoom on any zoomable image currently in the DOM,
 * and observe future images added dynamically (e.g. solutions).
 */
export function initImageZoom() {
  _ensureOverlay();
  _bindAll();

  // Watch for new images added to the DOM (solutions load lazily)
  const observer = new MutationObserver(() => _bindAll());
  observer.observe(document.body, { childList: true, subtree: true });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _ensureOverlay() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "zoom-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Zoomed image");
  overlay.innerHTML = `
    <button class="zoom-close" aria-label="Close zoom">✕</button>
    <img class="zoom-img" src="" alt="Zoomed question image" />
  `;

  overlay.addEventListener("click", e => {
    // Dismiss on backdrop click (not on the image itself)
    if (e.target === overlay || e.target.classList.contains("zoom-close")) {
      _close();
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") _close();
  });

  document.body.appendChild(overlay);
}

function _bindAll() {
  const selectors = [
    ".question-content img",
    "#solution-container img"
  ];

  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(img => {
      if (img.dataset.zoomBound) return;   // already wired
      img.dataset.zoomBound = "1";
      img.classList.add("zoomable");
      img.setAttribute("title", "Click to zoom");
      img.addEventListener("click", () => _open(img.src, img.alt));
    });
  });
}

function _open(src, alt = "") {
  const img = overlay.querySelector(".zoom-img");
  img.src = src;
  img.alt = alt;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function _close() {
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}