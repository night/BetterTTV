const $ = require('jquery');
const settings = require('../../settings');
const watcher = require('../../watcher');

class DisableChannelPointsMessageHighlightsModule {
    constructor() {
        settings.add({
            id: 'disableChannelPointsMessageHighlights',
            name: 'Disable Channel Points Message Highlights',
            defaultValue: false,
            description: 'Disables highlighting of the "Highlight my message" messages'
        });
        settings.on('changed.disableChannelPointsMessageHighlights', () => this.load());
        watcher.on('load.chat', () => this.load());
    }

    load() {
        $('.chat-list__lines').toggleClass('bttv-disable-channel-points-message-highlights', settings.get('disableChannelPointsMessageHighlights'));
    }
}

module.exports = new DisableChannelPointsMessageHighlightsModule();
