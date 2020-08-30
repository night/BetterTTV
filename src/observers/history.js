const SafeEventEmitter = require('../utils/safe-event-emitter');

class HistoryObserver extends SafeEventEmitter {
    constructor() {
        super();

        const pushState = history.pushState;
        const replaceState = history.replaceState;

        history.pushState = (...args) => {
            const state = args[0];
            pushState.apply(history, args);
            this.emit('pushState', location, state);
        };
        history.replaceState = (...args) => {
            const state = args[0];
            replaceState.apply(history, args);
            this.emit('replaceState', location, state);
        };
        window.addEventListener('popstate', ({state}) => this.emit('popState', location, state));
    }
}

module.exports = new HistoryObserver();
