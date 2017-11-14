const $ = require('jquery');
const settings = require('../../settings');
const watcher = require('../../watcher');

const VODCAST_SELECTOR = '.pill.is-watch-party';
const CARD_SELECTOR = '.card';

class HideVodcastsModule {
    constructor() {
        settings.add({
            id: 'hideVodcasts',
            name: 'Hide Vodcasts',
            defaultValue: false,
            description: 'Hide Vodcasts from directory listings'
        });
        settings.on('changed.hideVodcasts', value => value === true ? this.hide() : this.show());

        watcher.on('directory.vodcast', () => this.hide());
        watcher.on('load.communities', () => this.hide());
        watcher.on('load.directory', () => this.hide());
    }

    hide() {
        if (settings.get('hideVodcasts') === false) return;
        $(VODCAST_SELECTOR).closest(CARD_SELECTOR).parent(':visible').hide();
    }

    show() {
        $(VODCAST_SELECTOR).closest(CARD_SELECTOR).parent(':hidden').show();
    }
}

module.exports = new HideVodcastsModule();
