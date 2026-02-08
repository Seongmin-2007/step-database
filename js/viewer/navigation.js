let keyListenerBound = false;

/**
 * Initialise next/previous navigation.
 *
 * @param {Object} opts
 * @param {Function} opts.getQuestions   → () => array of questions (filtered)
 * @param {Function} opts.getCurrentId   → () => current questionID string
 * @param {Function} opts.onNavigate     → (question, index) => void
 */
export function initNavigation({ getQuestions, getCurrentId, onNavigate }) {
    const prevBtn = document.getElementById("prev-question");
    const nextBtn = document.getElementById("next-question");

    if (!prevBtn || !nextBtn) return;

    function getIndex() {
        const questions = getQuestions();
        const id = getCurrentId();
        return questions.findIndex(q => q.id === id);
    }

    function updateButtons() {
        const questions = getQuestions();
        const index = getIndex();

        prevBtn.disabled = index <= 0;
        nextBtn.disabled = index === -1 || index >= questions.length - 1;
    }

    function go(delta) {
        const questions = getQuestions();
        const index = getIndex();

        if (index === -1) return;

        const nextIndex = index + delta;
        if (nextIndex < 0 || nextIndex >= questions.length) return;

        onNavigate(questions[nextIndex], nextIndex);
    }

    prevBtn.onclick = () => go(-1);
    nextBtn.onclick = () => go(1);

    // Keyboard navigation (bind once globally)
    if (!keyListenerBound) {
        keyListenerBound = true;

        document.addEventListener("keydown", e => {
            // Don't hijack typing
            if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
                return;
            }

            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
        });
    }

    // Initial state
    updateButtons();

    return { updateButtons };
}
