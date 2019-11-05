const $ = require('jquery');
const watcher = require('../../watcher');

const containerSelector = '.chat-input__buttons-container';
const claimButtonSelector = '.claimable-bonus__icon';

class ChannelPoints {
    constructor() {
        watcher.on('load.channel', () => this.load());
    }

    load() {
        $(claimButtonSelector).click();

        const bonusPointsObserver = new window.MutationObserver(mutations =>
            mutations.forEach(mutation => {
                for (const el of mutation.addedNodes) {
                    const $el = $(el);

                    $el.find(claimButtonSelector).click();
                }
            })
        );

        const observe = (_watcher, element) => {
            if (!element) return;
            if (_watcher) _watcher.disconnect();
            _watcher.observe(element, {childList: true, subtree: true});
        };

        observe(bonusPointsObserver, $(containerSelector)[0]);
    }
}

module.exports = new ChannelPoints();
