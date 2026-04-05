// js/ui/lazy-dom.js
// Utilities for mounting and unmounting rarely used UI fragments on demand.
console.log("Lazy DOM utilities loaded");

const lazyShelvedElements = new Map();

function resolveLazyDomParent(parentOrSelector) {
    if (!parentOrSelector) return null;
    if (typeof parentOrSelector === 'string') {
        return document.querySelector(parentOrSelector);
    }
    return parentOrSelector;
}

function mountShelvedElement(elementId, parentOrSelector) {
    const record = lazyShelvedElements.get(elementId);
    if (!record || !record.element) {
        return null;
    }

    if (record.element.isConnected) {
        return record.element;
    }

    const parent = resolveLazyDomParent(parentOrSelector) || record.parent;
    if (!parent) {
        console.warn(`Lazy DOM parent not found for shelved element: ${elementId}`);
        return null;
    }

    const nextSibling = record.nextSibling && record.nextSibling.parentNode === parent
        ? record.nextSibling
        : null;

    parent.insertBefore(record.element, nextSibling);

    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
    if (typeof window.applyUIText === 'function') {
        window.applyUIText();
    }

    return record.element;
}

function ensureLazyElementMounted(elementId, templateId, parentOrSelector) {
    const existing = document.getElementById(elementId);
    if (existing) {
        return existing;
    }

    const restored = mountShelvedElement(elementId, parentOrSelector);
    if (restored) {
        return restored;
    }

    if (!templateId) {
        return null;
    }

    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
        console.warn(`Lazy DOM template not found: ${templateId}`);
        return null;
    }

    const parent = resolveLazyDomParent(parentOrSelector);
    if (!parent) {
        console.warn(`Lazy DOM parent not found for ${elementId}`);
        return null;
    }

    const fragment = template.content.cloneNode(true);
    parent.appendChild(fragment);

    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
    if (typeof window.applyUIText === 'function') {
        window.applyUIText();
    }

    return document.getElementById(elementId);
}

function shelveLazyElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        return lazyShelvedElements.has(elementId);
    }

    lazyShelvedElements.set(elementId, {
        element,
        parent: element.parentNode || null,
        nextSibling: element.nextSibling || null
    });

    if (element.parentNode) {
        element.parentNode.removeChild(element);
    }

    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }

    return true;
}

function shelveLazyElements(elementIds) {
    if (!Array.isArray(elementIds)) {
        return [];
    }

    return elementIds.map((id) => ({ id, removed: shelveLazyElement(id) }));
}

function unmountLazyElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element || !element.parentNode) {
        return false;
    }

    element.parentNode.removeChild(element);
    return true;
}

function unmountLazyElements(elementIds) {
    if (!Array.isArray(elementIds)) {
        return [];
    }

    return elementIds.map((id) => ({ id, removed: unmountLazyElement(id) }));
}

function initializeLazyUIPruning() {
    shelveLazyElements([
        'config-menu',
        'history-menu',
        'investigation-menu',
        'move-menu',
        'investigation-panel',
        'topic-menu',
        'evidence-container',
        'evidence-popup',
        'life-bar-container',
        'ce-controls',
        'ce-arrow-container'
    ]);

    if (typeof window.refreshDOMGlobals === 'function') {
        window.refreshDOMGlobals();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLazyUIPruning, { once: true });
} else {
    queueMicrotask(initializeLazyUIPruning);
}

window.ensureLazyElementMounted = ensureLazyElementMounted;
window.mountShelvedElement = mountShelvedElement;
window.shelveLazyElement = shelveLazyElement;
window.shelveLazyElements = shelveLazyElements;
window.unmountLazyElement = unmountLazyElement;
window.unmountLazyElements = unmountLazyElements;
