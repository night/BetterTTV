const SafeEventEmitter = require('../utils/safe-event-emitter');

const IGNORED_HTML_TAGS = new Set(['BR', 'HEAD', 'LINK', 'META', 'SCRIPT', 'STYLE']);

let observer;
const observedIds = Object.create(null);
const observedClassNames = Object.create(null);
const attributeObservers = new Map();

function parseSelector(selector) {
    const partialSelectors = selector.split(',').map(s => s.trim());
    const ids = [];
    const classNames = [];
    for (const partialSelector of partialSelectors) {
        if (partialSelector.startsWith('#')) {
            ids.push({
                key: partialSelector.split(' ')[0].split('#')[1],
                partialSelector
            });
        } else if (partialSelector.startsWith('.')) {
            classNames.push({
                key: partialSelector.split(' ')[0].split('.')[1],
                partialSelector
            });
        }
    }
    return {
        ids,
        classNames
    };
}

function startAttributeObserver(observedType, emitter, node) {
    const attributeObserver = new window.MutationObserver(
        () => emitter.emit(observedType.selector, node, node.isConnected)
    );
    attributeObserver.observe(node, {attributes: true, subtree: true});
    attributeObservers.set(observedType, attributeObserver);
}

function stopAttributeObserver(observedType) {
    const attributeObserver = attributeObservers.get(observedType);
    if (!attributeObserver) {
        return;
    }

    attributeObserver.disconnect();
    attributeObservers.delete(observedType);
}

function processObservedResults(emitter, node, results) {
    if (!results || results.length === 0) {
        return;
    }

    for (const observedType of results) {
        const {partialSelector, selector, options} = observedType;
        const foundNode = partialSelector.includes(' ') ? node.querySelector(selector) : node;
        if (!foundNode) {
            continue;
        }
        if (options && options.useParentNode) {
            foundNode = node;
        }
        const isConnected = foundNode.isConnected;
        if (options && options.attributes) {
            if (isConnected) {
                startAttributeObserver(observedType, emitter, foundNode);
            } else {
                stopAttributeObserver(observedType);
            }
        }
        emitter.emit(selector, foundNode, isConnected);
    }
}

function processMutations(emitter, nodes) {
    if (!nodes || nodes.length === 0) {
        return;
    }

    for (const node of nodes) {
        let nodeId = node.id;
        if (typeof nodeId === 'string' && nodeId.length > 0) {
            nodeId = nodeId.trim();
            processObservedResults(emitter, node, observedIds[nodeId]);
        }

        const nodeClassList = node.classList;
        if (nodeClassList && nodeClassList.length > 0) {
            for (let className of nodeClassList) {
                className = className.trim();
                processObservedResults(emitter, node, observedClassNames[className]);
            }
        }
    }
}

class DOMObserver extends SafeEventEmitter {
    constructor() {
        super();

        observer = new window.MutationObserver(mutations => {
            const pendingNodes = [];
            for (const {addedNodes, removedNodes} of mutations) {
                if (!addedNodes || !removedNodes || (addedNodes.length === 0 && removedNodes.length === 0)) {
                    continue;
                }

                for (let i = 0; i < 2; i++) {
                    const nodes = i === 0 ? addedNodes : removedNodes;
                    for (const node of nodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE || IGNORED_HTML_TAGS.has(node.nodeName)) {
                            continue;
                        }

                        pendingNodes.push(node);
                        if (node.childElementCount === 0) {
                            continue;
                        }

                        for (const childNode of node.querySelectorAll('[id],[class]')) {
                            pendingNodes.push(childNode);
                        }
                    }
                }
            }

            if (pendingNodes.length === 0) {
                return;
            }

            processMutations(this, pendingNodes);
        });
        observer.observe(document, {childList: true, subtree: true});
    }

    on(selector, callback, options) {
        const parsedSelector = parseSelector(selector);

        for (const selectorType of Object.keys(parsedSelector)) {
            const observedSelectorType = selectorType === 'ids' ? observedIds : observedClassNames;

            for (const {key, partialSelector} of parsedSelector[selectorType]) {
                const currentObservedTypeSelectors = observedSelectorType[key];
                const observedType = {partialSelector, selector, options};
                if (!currentObservedTypeSelectors) {
                    observedSelectorType[key] = [observedType];
                    continue;
                }
                currentObservedTypeSelectors.push(observedType);
            }
        }

        // trigger dom mutations for existing elements for on page
        processMutations(this, [...document.querySelectorAll(selector)]);

        return super.on(selector, callback);
    }

    // Note: you cannot call this directly as this is behind SafeEventEmitter
    //       use the closure returned from `on` to remove the event listener if needed
    off(selector, callback) {
        this.removeListener(selector, callback);

        if (this.listenerCount(selector) > 0) {
            return;
        }

        const parsedSelector = parseSelector(selector);

        for (const selectorType of Object.keys(parsedSelector)) {
            const observedSelectorType = selectorType === 'ids' ? observedIds : observedClassNames;

            for (const {key} of parsedSelector[selectorType]) {
                const currentObservedTypeSelectors = observedSelectorType[key];
                if (!currentObservedTypeSelectors) {
                    continue;
                }
                const observedTypeIndex = currentObservedTypeSelectors.findIndex(
                    observedType => observedType.selector === selector
                );
                if (observedTypeIndex === -1) {
                    continue;
                }
                const observedType = currentObservedTypeSelectors[observedTypeIndex];
                stopAttributeObserver(observedType);
                currentObservedTypeSelectors.splice(observedTypeIndex);
                if (currentObservedTypeSelectors.length === 0) {
                    delete observedSelectorType[key];
                }
            }
        }
    }
}

module.exports = new DOMObserver();
