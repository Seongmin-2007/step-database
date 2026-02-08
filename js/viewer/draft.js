function key(id) {
    return `draft:${id}`;
}

export function saveDraft(id, data) {
    localStorage.setItem(key(id), JSON.stringify(data));
}

export function loadDraft(id) {
    const raw = localStorage.getItem(key(id));
    return raw ? JSON.parse(raw) : null;
}

export function clearDraft(id) {
    localStorage.removeItem(key(id));
}
